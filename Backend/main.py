from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2 import OperationalError, Error
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure, ConfigurationError
from bson import ObjectId, json_util
import pymysql
import pymysql.cursors
from typing import List, Optional, Any, Dict
from contextlib import contextmanager
import time
import os
import re
import json
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(
    title="AuraDB AI Query API",
    description="API for PostgreSQL/MongoDB connections and AI-powered query generation",
    version="3.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store connection details in memory (for demo purposes)
db_connection_store: Dict[str, Any] = {}


class ConnectionRequest(BaseModel):
    host: str = Field(default="", description="Database host address")
    port: int = Field(default=5432, description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(default="", description="Database username")
    password: str = Field(default="", description="Database password")
    db_type: str = Field(default="postgresql", description="Database type: postgresql or mongodb")
    connection_string: str = Field(default="", description="Full connection string (MongoDB SRV etc.)")


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool
    primary_key: bool


class TableInfo(BaseModel):
    name: str
    columns: List[ColumnInfo]


class SchemaInfo(BaseModel):
    schema_name: str
    tables: List[TableInfo]


class ConnectionSuccessResponse(BaseModel):
    success: bool = True
    schemas: List[SchemaInfo]
    postgres_version: Optional[str] = None


class ConnectionErrorResponse(BaseModel):
    success: bool = False
    error: str


class ExecuteRequest(BaseModel):
    sql: str = Field(..., description="Query to execute (SQL for PostgreSQL, JSON for MongoDB)")


class ExecuteResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: float


class AIQueryRequest(BaseModel):
    host: str = Field(default="", description="Database host address")
    port: int = Field(default=5432, description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(default="", description="Database username")
    password: str = Field(default="", description="Database password")
    prompt: str = Field(..., description="Natural language query")
    safe_mode: bool = Field(default=True, description="Whether to block dangerous operations")
    db_type: str = Field(default="postgresql", description="Database type: postgresql, mongodb, or mysql")
    connection_string: str = Field(default="", description="Full connection string (MongoDB SRV etc.)")


class AIQuerySuccessResponse(BaseModel):
    success: bool = True
    query: str
    rows: Optional[List[Dict[str, Any]]] = None
    affected_rows: Optional[int] = None
    columns: Optional[List[str]] = None


class AIQueryErrorResponse(BaseModel):
    success: bool = False
    query: Optional[str] = None
    error: str
    details: Optional[str] = None


import subprocess
import socket
import dns.resolver
import certifi


def resolve_host(host: str) -> str:
    """Resolve hostname, falling back to Google DNS (8.8.8.8) if local DNS fails."""
    # First try local DNS
    try:
        socket.getaddrinfo(host, 5432, socket.AF_UNSPEC, socket.SOCK_STREAM)
        return host
    except socket.gaierror:
        pass
    
    # Fallback: resolve via Google DNS using dnspython
    try:
        resolver = dns.resolver.Resolver()
        resolver.nameservers = ['8.8.8.8', '8.8.4.4']
        
        # Try A record (IPv4) first
        try:
            answers = resolver.resolve(host, 'A')
            return str(answers[0])
        except Exception:
            pass
        
        # Try AAAA record (IPv6)
        try:
            answers = resolver.resolve(host, 'AAAA')
            return str(answers[0])
        except Exception:
            pass
    except Exception:
        pass
    
    return host


@contextmanager
def get_db_connection(host: str, port: int, database: str, username: str, password: str):
    """Context manager for database connections."""
    conn = None
    resolved_host = resolve_host(host)
    try:
        conn = psycopg2.connect(
            host=resolved_host,
            port=port,
            dbname=database,
            user=username,
            password=password,
            connect_timeout=15,
            sslmode="prefer"
        )
        yield conn
    finally:
        if conn is not None:
            conn.close()


def get_schemas_and_tables(conn) -> List[SchemaInfo]:
    """Fetch all non-system schemas, their tables, and columns."""
    schemas_query = """
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND schema_name NOT LIKE 'pg_temp_%'
        AND schema_name NOT LIKE 'pg_toast_temp_%'
        ORDER BY schema_name;
    """
    
    tables_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = %s 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """
    
    columns_query = """
        SELECT 
            c.column_name,
            c.data_type,
            c.is_nullable,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT ku.column_name, ku.table_schema, ku.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
                ON tc.constraint_name = ku.constraint_name
                AND tc.table_schema = ku.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name 
            AND c.table_schema = pk.table_schema 
            AND c.table_name = pk.table_name
        WHERE c.table_schema = %s AND c.table_name = %s
        ORDER BY c.ordinal_position;
    """
    
    result = []
    
    with conn.cursor() as cursor:
        # Fetch all schemas
        cursor.execute(schemas_query)
        schemas = cursor.fetchall()
        
        # For each schema, fetch its tables and columns
        for (schema_name,) in schemas:
            cursor.execute(tables_query, (schema_name,))
            tables = cursor.fetchall()
            
            table_list = []
            for (table_name,) in tables:
                cursor.execute(columns_query, (schema_name, table_name))
                columns = cursor.fetchall()
                
                column_list = [
                    ColumnInfo(
                        name=col[0],
                        type=col[1],
                        nullable=col[2] == 'YES',
                        primary_key=col[3]
                    )
                    for col in columns
                ]
                
                table_list.append(TableInfo(name=table_name, columns=column_list))
            
            result.append(SchemaInfo(schema_name=schema_name, tables=table_list))
    
    return result

# ==================== MongoDB Functions ====================

def get_mongo_client(host: str = "", port: int = 27017, username: str = "", password: str = "", connection_string: str = ""):
    """Create a MongoDB client connection."""
    client_kwargs = {
        "serverSelectionTimeoutMS": 15000,
        "connectTimeoutMS": 20000,
        "socketTimeoutMS": 20000,
        # Prefer explicit CA bundle to avoid TLS handshake issues in some environments.
        "tlsCAFile": certifi.where(),
    }

    if connection_string:
        if connection_string.startswith("mongodb+srv://") and "tls=" not in connection_string.lower():
            separator = "&" if "?" in connection_string else "?"
            connection_string = f"{connection_string}{separator}tls=true"
        return MongoClient(connection_string, **client_kwargs)

    if username and password:
        uri = f"mongodb://{username}:{password}@{host}:{port}/"
    else:
        uri = f"mongodb://{host}:{port}/"

    return MongoClient(uri, **client_kwargs)


def serialize_mongo_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = serialize_mongo_doc(value)
        elif isinstance(value, list):
            result[key] = [
                serialize_mongo_doc(item) if isinstance(item, dict) 
                else str(item) if isinstance(item, ObjectId) 
                else item 
                for item in value
            ]
        else:
            result[key] = value
    return result


def get_mongo_schema(db) -> List[SchemaInfo]:
    """Fetch MongoDB collections and sample their field structure."""
    collections = db.list_collection_names()
    table_list = []
    
    for coll_name in sorted(collections):
        # Sample documents to infer schema
        sample = list(db[coll_name].find().limit(20))
        field_types: Dict[str, set] = {}
        
        for doc in sample:
            for key, value in doc.items():
                type_name = type(value).__name__
                if isinstance(value, ObjectId):
                    type_name = "ObjectId"
                elif isinstance(value, list):
                    type_name = "Array"
                elif isinstance(value, dict):
                    type_name = "Object"
                elif isinstance(value, bool):
                    type_name = "Boolean"
                elif isinstance(value, int):
                    type_name = "Int"
                elif isinstance(value, float):
                    type_name = "Double"
                elif isinstance(value, str):
                    type_name = "String"
                elif value is None:
                    type_name = "Null"
                    
                if key not in field_types:
                    field_types[key] = set()
                field_types[key].add(type_name)
        
        columns = []
        for field_name, types in field_types.items():
            type_str = "/".join(sorted(types))
            columns.append(ColumnInfo(
                name=field_name,
                type=type_str,
                nullable=True,
                primary_key=(field_name == "_id")
            ))
        
        table_list.append(TableInfo(name=coll_name, columns=columns))
    
    return [SchemaInfo(schema_name="default", tables=table_list)]


def parse_mongo_error(error: Exception) -> str:
    """Parse MongoDB errors into user-friendly messages."""
    error_msg = str(error).lower()
    
    if "authentication failed" in error_msg:
        return "Authentication failed: Invalid username or password"
    elif "server selection timeout" in error_msg or "timed out" in error_msg:
        return "Connection timeout: Could not reach MongoDB server. Check host and port."
    elif "connection refused" in error_msg:
        return "Connection refused: Check if MongoDB is running on the specified port"
    elif "name or service not known" in error_msg or "nodename nor servname" in error_msg:
        return "DNS resolution failed: Your network could not resolve the hostname."
    elif "network is unreachable" in error_msg:
        return "Network unreachable: Cannot connect to the specified host."
    else:
        return str(error)


def parse_connection_error(error: Exception) -> str:
    """Parse psycopg2 errors into user-friendly messages."""
    error_msg = str(error).lower()
    
    if "password authentication failed" in error_msg:
        return "Authentication failed: Invalid username or password"
    elif "does not exist" in error_msg and "database" in error_msg:
        return f"Database does not exist: {error}"
    elif "could not connect to server" in error_msg or "connection refused" in error_msg:
        return "Host unreachable: Could not connect to the database server"
    elif "timeout" in error_msg or "timed out" in error_msg:
        return "Connection timeout: The server took too long to respond"
    elif "no route to host" in error_msg:
        return "Host unreachable: No route to the specified host"
    elif "name or service not known" in error_msg or "nodename nor servname provided" in error_msg:
        return "DNS resolution failed: Your network could not resolve the hostname. This is likely a local DNS restriction (e.g. university/corporate network). Try using a local PostgreSQL instance or a different network."
    elif "network is unreachable" in error_msg:
        return "Network unreachable: The resolved address (likely IPv6) is not reachable from your network. Try using a local PostgreSQL instance or a network with IPv6 support."
    elif "connection refused" in error_msg:
        return "Connection refused: Check if PostgreSQL is running on the specified port"
    else:
        return str(error)


# ==================== MySQL Functions ====================

def get_mysql_connection(host: str, port: int, database: str, username: str, password: str):
    """Create a MySQL connection."""
    resolved_host = resolve_host(host)
    return pymysql.connect(
        host=resolved_host,
        port=port,
        database=database,
        user=username,
        password=password,
        connect_timeout=15,
        cursorclass=pymysql.cursors.Cursor,
        charset='utf8mb4',
    )


def get_mysql_schemas_and_tables(conn) -> List[SchemaInfo]:
    """Fetch tables and columns from a MySQL database."""
    tables_query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """

    columns_query = """
        SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            CASE WHEN c.column_key = 'PRI' THEN 1 ELSE 0 END as is_primary_key
        FROM information_schema.columns c
        WHERE c.table_schema = DATABASE() AND c.table_name = %s
        ORDER BY c.ordinal_position;
    """

    result = []
    with conn.cursor() as cursor:
        cursor.execute("SELECT DATABASE();")
        db_name = cursor.fetchone()[0] or 'default'

        cursor.execute(tables_query)
        tables = cursor.fetchall()

        table_list = []
        for (table_name,) in tables:
            cursor.execute(columns_query, (table_name,))
            columns = cursor.fetchall()

            column_list = [
                ColumnInfo(
                    name=col[0],
                    type=col[1],
                    nullable=col[2] == 'YES',
                    primary_key=bool(col[3])
                )
                for col in columns
            ]
            table_list.append(TableInfo(name=table_name, columns=column_list))

        result.append(SchemaInfo(schema_name=db_name, tables=table_list))

    return result


def _split_sql_statements(sql: str) -> list:
    """Split a SQL string into individual statements, respecting quoted strings."""
    statements = []
    current = []
    in_single_quote = False
    in_double_quote = False
    in_backtick = False
    i = 0
    while i < len(sql):
        ch = sql[i]
        # Handle escape sequences inside quotes
        if ch == '\\' and (in_single_quote or in_double_quote):
            current.append(ch)
            i += 1
            if i < len(sql):
                current.append(sql[i])
            i += 1
            continue
        if ch == "'" and not in_double_quote and not in_backtick:
            in_single_quote = not in_single_quote
        elif ch == '"' and not in_single_quote and not in_backtick:
            in_double_quote = not in_double_quote
        elif ch == '`' and not in_single_quote and not in_double_quote:
            in_backtick = not in_backtick
        elif ch == ';' and not in_single_quote and not in_double_quote and not in_backtick:
            stmt = ''.join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
            i += 1
            continue
        current.append(ch)
        i += 1
    # Last statement (may not end with ;)
    stmt = ''.join(current).strip()
    if stmt:
        statements.append(stmt)
    return statements


async def execute_mysql_query(sql: str, conn_details: dict):
    """Execute one or more MySQL statements."""
    try:
        start_time = time.time()
        conn = get_mysql_connection(
            host=conn_details['host'],
            port=conn_details['port'],
            database=conn_details['database'],
            username=conn_details['username'],
            password=conn_details['password']
        )
        try:
            statements = _split_sql_statements(sql)
            last_result = None
            total_row_count = 0

            with conn.cursor() as cursor:
                for stmt in statements:
                    cursor.execute(stmt)

                    if cursor.description:
                        columns = [desc[0] for desc in cursor.description]
                        rows = cursor.fetchall()
                        row_dicts = [dict(zip(columns, row)) for row in rows]
                        last_result = (columns, row_dicts)
                        total_row_count = len(row_dicts)
                    else:
                        total_row_count += cursor.rowcount

                conn.commit()

            execution_time = (time.time() - start_time) * 1000

            if last_result:
                columns, row_dicts = last_result
                return ExecuteResponse(
                    columns=columns,
                    rows=row_dicts,
                    row_count=len(row_dicts),
                    execution_time_ms=round(execution_time, 2)
                )
            else:
                return ExecuteResponse(
                    columns=[],
                    rows=[],
                    row_count=total_row_count,
                    execution_time_ms=round(execution_time, 2)
                )
        finally:
            conn.close()

    except pymysql.Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


def format_mysql_schema_for_ai(schemas: List[SchemaInfo]) -> str:
    """Format MySQL schema information for AI context."""
    lines = ["MySQL Database Schema:"]
    for schema in schemas:
        lines.append(f"\nDatabase: {schema.schema_name}")
        for table in schema.tables:
            columns_str = ", ".join([
                f"{col.name} ({col.type}{'[PK]' if col.primary_key else ''})"
                for col in table.columns
            ])
            lines.append(f"  Table: {table.name} ({columns_str})")
    return "\n".join(lines)


@app.post(
    "/connect",
    response_model=ConnectionSuccessResponse,
    responses={
        200: {"model": ConnectionSuccessResponse, "description": "Connection successful"},
        400: {"model": ConnectionErrorResponse, "description": "Connection failed"}
    }
)
async def test_connection(request: ConnectionRequest):
    """
    Test database connection and retrieve schema information.
    Supports both PostgreSQL, MySQL, and MongoDB.
    """
    if request.db_type == "mongodb":
        try:
            client = get_mongo_client(
                host=request.host,
                port=request.port,
                username=request.username,
                password=request.password,
                connection_string=request.connection_string
            )
            db = client[request.database]
            # Force a connection check
            client.admin.command('ping')
            
            schemas = get_mongo_schema(db)
            
            # Get MongoDB version
            server_info = client.server_info()
            mongo_version = f"MongoDB {server_info.get('version', 'unknown')}"
            
            # Store connection details
            db_connection_store['current'] = {
                'host': request.host,
                'port': request.port,
                'database': request.database,
                'username': request.username,
                'password': request.password,
                'db_type': 'mongodb',
                'connection_string': request.connection_string,
                'postgres_version': mongo_version
            }
            
            client.close()
            return ConnectionSuccessResponse(success=True, schemas=schemas, postgres_version=mongo_version)
            
        except (ConnectionFailure, ConfigurationError) as e:
            error_message = parse_mongo_error(e)
            raise HTTPException(status_code=400, detail=error_message)
        except OperationFailure as e:
            raise HTTPException(status_code=400, detail=f"MongoDB error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    elif request.db_type == "mysql":
        # MySQL connection
        try:
            conn = get_mysql_connection(
                host=request.host,
                port=request.port,
                database=request.database,
                username=request.username,
                password=request.password
            )
            schemas = get_mysql_schemas_and_tables(conn)
            
            # Get MySQL version
            with conn.cursor() as cursor:
                cursor.execute("SELECT VERSION();")
                version_result = cursor.fetchone()
                mysql_version = f"MySQL {version_result[0]}" if version_result else None
            
            # Store connection details
            db_connection_store['current'] = {
                'host': request.host,
                'port': request.port,
                'database': request.database,
                'username': request.username,
                'password': request.password,
                'db_type': 'mysql',
                'postgres_version': mysql_version
            }
            
            conn.close()
            return ConnectionSuccessResponse(success=True, schemas=schemas, postgres_version=mysql_version)
            
        except pymysql.OperationalError as e:
            raise HTTPException(status_code=400, detail=f"MySQL connection error: {str(e)}")
        except pymysql.Error as e:
            raise HTTPException(status_code=400, detail=f"MySQL error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    else:
        # PostgreSQL connection
        try:
            with get_db_connection(
                host=request.host,
                port=request.port,
                database=request.database,
                username=request.username,
                password=request.password
            ) as conn:
                schemas = get_schemas_and_tables(conn)
                
                # Get PostgreSQL version
                with conn.cursor() as cursor:
                    cursor.execute("SELECT version();")
                    version_result = cursor.fetchone()
                    postgres_version = version_result[0] if version_result else None
                
                # Store connection details
                db_connection_store['current'] = {
                    'host': request.host,
                    'port': request.port,
                    'database': request.database,
                    'username': request.username,
                    'password': request.password,
                    'db_type': 'postgresql',
                    'postgres_version': postgres_version
                }
                
                return ConnectionSuccessResponse(success=True, schemas=schemas, postgres_version=postgres_version)
                
        except OperationalError as e:
            error_message = parse_connection_error(e)
            raise HTTPException(status_code=400, detail=error_message)
        
        except Error as e:
            raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/execute")
async def execute_sql(request: ExecuteRequest):
    """Execute a query and return results. Supports SQL (PostgreSQL) and MongoDB queries."""
    if 'current' not in db_connection_store:
        raise HTTPException(status_code=400, detail="No database connection. Please connect first.")
    
    conn_details = db_connection_store['current']
    db_type = conn_details.get('db_type', 'postgresql')
    
    if db_type == "mongodb":
        return await execute_mongo_query(request.sql, conn_details)
    elif db_type == "mysql":
        return await execute_mysql_query(request.sql, conn_details)
    else:
        return await execute_postgres_query(request.sql, conn_details)


async def execute_mongo_query(query_str: str, conn_details: dict):
    """Execute a MongoDB query string."""
    try:
        start_time = time.time()
        client = get_mongo_client(
            host=conn_details.get('host', ''),
            port=conn_details.get('port', 27017),
            username=conn_details.get('username', ''),
            password=conn_details.get('password', ''),
            connection_string=conn_details.get('connection_string', '')
        )
        db = client[conn_details['database']]
        
        # Parse the query - expected format: db.collection.method({...})
        # Or JSON format: {"collection": "name", "operation": "find", "filter": {...}, ...}
        query_str = query_str.strip()
        
        # Try JSON format first
        try:
            query_obj = json.loads(query_str)
            if isinstance(query_obj, dict) and 'collection' in query_obj:
                collection_name = query_obj['collection']
                operation = query_obj.get('operation', 'find')
                coll = db[collection_name]
                
                result = _execute_mongo_operation(coll, operation, query_obj)
                execution_time = (time.time() - start_time) * 1000
                client.close()
                
                if isinstance(result, list):
                    rows = [serialize_mongo_doc(doc) for doc in result]
                    columns = list(set().union(*(doc.keys() for doc in rows))) if rows else []
                    return ExecuteResponse(columns=columns, rows=rows, row_count=len(rows), execution_time_ms=round(execution_time, 2))
                else:
                    return ExecuteResponse(columns=[], rows=[], row_count=result if isinstance(result, int) else 0, execution_time_ms=round(execution_time, 2))
        except json.JSONDecodeError:
            pass
        
        # Try db.collection.method() syntax
        match = re.match(r'db\.(\w+)\.(\w+)\((.*)\)$', query_str, re.DOTALL)
        if match:
            collection_name = match.group(1)
            method = match.group(2)
            args_str = match.group(3).strip()
            
            coll = db[collection_name]
            
            # Parse arguments
            args = []
            if args_str:
                # Split on top-level commas (handling nested braces)
                depth = 0
                current = ""
                for ch in args_str:
                    if ch in '{[':
                        depth += 1
                    elif ch in '}]':
                        depth -= 1
                    elif ch == ',' and depth == 0:
                        args.append(json.loads(current.strip()))
                        current = ""
                        continue
                    current += ch
                if current.strip():
                    args.append(json.loads(current.strip()))
            
            query_obj = {'collection': collection_name, 'operation': method}
            if method == 'find':
                query_obj['filter'] = args[0] if args else {}
                if len(args) > 1:
                    query_obj['projection'] = args[1]
            elif method in ('insertOne', 'insertMany'):
                query_obj['document'] = args[0] if args else {}
            elif method in ('updateOne', 'updateMany'):
                query_obj['filter'] = args[0] if args else {}
                query_obj['update'] = args[1] if len(args) > 1 else {}
            elif method in ('deleteOne', 'deleteMany'):
                query_obj['filter'] = args[0] if args else {}
            elif method == 'aggregate':
                query_obj['pipeline'] = args[0] if args else []
            elif method == 'countDocuments':
                query_obj['filter'] = args[0] if args else {}
            
            result = _execute_mongo_operation(coll, method, query_obj)
            execution_time = (time.time() - start_time) * 1000
            client.close()
            
            if isinstance(result, list):
                rows = [serialize_mongo_doc(doc) for doc in result]
                columns = list(set().union(*(doc.keys() for doc in rows))) if rows else []
                return ExecuteResponse(columns=columns, rows=rows, row_count=len(rows), execution_time_ms=round(execution_time, 2))
            else:
                return ExecuteResponse(columns=[], rows=[], row_count=result if isinstance(result, int) else 0, execution_time_ms=round(execution_time, 2))
        
        client.close()
        raise HTTPException(status_code=400, detail="Invalid MongoDB query format. Use JSON format: {\"collection\": \"name\", \"operation\": \"find\", \"filter\": {}} or db.collection.method() syntax.")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def _execute_mongo_operation(coll, operation: str, query_obj: dict):
    """Execute a MongoDB operation and return results."""
    if operation == 'find':
        filter_doc = query_obj.get('filter', {})
        projection = query_obj.get('projection', None)
        limit = query_obj.get('limit', 100)
        cursor = coll.find(filter_doc, projection).limit(limit)
        return list(cursor)
    elif operation == 'findOne':
        doc = coll.find_one(query_obj.get('filter', {}))
        return [doc] if doc else []
    elif operation == 'aggregate':
        pipeline = query_obj.get('pipeline', [])
        return list(coll.aggregate(pipeline))
    elif operation == 'countDocuments':
        count = coll.count_documents(query_obj.get('filter', {}))
        return [{"count": count}]
    elif operation == 'insertOne':
        result = coll.insert_one(query_obj.get('document', {}))
        return 1
    elif operation == 'insertMany':
        docs = query_obj.get('document', query_obj.get('documents', []))
        result = coll.insert_many(docs if isinstance(docs, list) else [docs])
        return len(result.inserted_ids)
    elif operation == 'updateOne':
        result = coll.update_one(query_obj.get('filter', {}), query_obj.get('update', {}))
        return result.modified_count
    elif operation == 'updateMany':
        result = coll.update_many(query_obj.get('filter', {}), query_obj.get('update', {}))
        return result.modified_count
    elif operation == 'deleteOne':
        result = coll.delete_one(query_obj.get('filter', {}))
        return result.deleted_count
    elif operation == 'deleteMany':
        result = coll.delete_many(query_obj.get('filter', {}))
        return result.deleted_count
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported MongoDB operation: {operation}")


async def execute_postgres_query(sql: str, conn_details: dict):
    """Execute a PostgreSQL query."""
    try:
        start_time = time.time()
        
        with get_db_connection(
            host=conn_details['host'],
            port=conn_details['port'],
            database=conn_details['database'],
            username=conn_details['username'],
            password=conn_details['password']
        ) as conn:
            with conn.cursor() as cursor:
                cursor.execute(sql)
                
                # Check if query returns results
                if cursor.description:
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()
                    
                    # Convert rows to list of dicts
                    row_dicts = [dict(zip(columns, row)) for row in rows]
                    
                    execution_time = (time.time() - start_time) * 1000
                    
                    return ExecuteResponse(
                        columns=columns,
                        rows=row_dicts,
                        row_count=len(row_dicts),
                        execution_time_ms=round(execution_time, 2)
                    )
                else:
                    # For INSERT, UPDATE, DELETE
                    conn.commit()
                    execution_time = (time.time() - start_time) * 1000
                    return ExecuteResponse(
                        columns=[],
                        rows=[],
                        row_count=cursor.rowcount,
                        execution_time_ms=round(execution_time, 2)
                    )
                    
    except Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


def format_schema_for_ai(schemas: List[SchemaInfo]) -> str:
    """Format schema information for AI context."""
    lines = ["Database Schema:"]
    for schema in schemas:
        lines.append(f"\nSchema: {schema.schema_name}")
        for table in schema.tables:
            columns_str = ", ".join([
                f"{col.name} ({col.type}{'[PK]' if col.primary_key else ''})"
                for col in table.columns
            ])
            lines.append(f"  Table: {table.name}")
            lines.append(f"    Columns: {columns_str}")
    return "\n".join(lines)


def format_mongo_schema_for_ai(schemas: List[SchemaInfo]) -> str:
    """Format MongoDB collection info for AI context."""
    lines = ["MongoDB Collections:"]
    for schema in schemas:
        for table in schema.tables:
            fields_str = ", ".join([
                f"{col.name} ({col.type})"
                for col in table.columns
            ])
            lines.append(f"\n  Collection: {table.name}")
            lines.append(f"    Fields: {fields_str}")
    return "\n".join(lines)


def extract_mongo_query_from_response(response_text: str) -> str:
    """Extract MongoDB query JSON from AI response, handling code blocks."""
    # Try to extract from markdown code block
    match = re.search(r'```(?:json|javascript|mongo)?\s*(.*?)\s*```', response_text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return response_text.strip()


def validate_mongo_query(query_str: str, safe_mode: bool = True) -> tuple[bool, str]:
    """Validate a MongoDB query for safety."""
    try:
        query_obj = json.loads(query_str)
    except json.JSONDecodeError:
        return True, ""  # Non-JSON format, let execution handle it
    
    if not isinstance(query_obj, dict):
        return False, "Query must be a JSON object"
    
    if safe_mode:
        operation = query_obj.get('operation', 'find')
        blocked_ops = ['drop', 'dropCollection', 'dropDatabase', 'createIndex', 'dropIndex']
        if operation in blocked_ops:
            return False, f"Blocked in Safe Mode: {operation}. Disable Safe Mode to execute this operation."
        
        if operation == 'deleteMany' and query_obj.get('filter', {}) == {}:
            return False, "deleteMany with empty filter is blocked in Safe Mode (would delete all documents)."
    
    return True, ""


def validate_sql(sql: str, safe_mode: bool = True) -> tuple[bool, str]:
    """
    Validate SQL query for safety.
    Returns (is_valid, error_message).
    """
    sql_upper = sql.upper().strip()
    
    if safe_mode:
        # Block dangerous operations in safe mode
        dangerous_patterns = [
            (r'\bDROP\s+DATABASE\b', 'DROP DATABASE'),
            (r'\bDROP\s+TABLE\b', 'DROP TABLE'),
            (r'\bDROP\s+SCHEMA\b', 'DROP SCHEMA'),
            (r'\bTRUNCATE\b', 'TRUNCATE'),
            (r'\bALTER\s+SYSTEM\b', 'ALTER SYSTEM'),
            (r'\bALTER\s+TABLE\b', 'ALTER TABLE'),
            (r'\bDELETE\s+FROM\b(?!\s*\S+\s+WHERE)', 'DELETE without WHERE clause'),
        ]
        
        for pattern, name in dangerous_patterns:
            if re.search(pattern, sql_upper):
                return False, f"Blocked in Safe Mode: {name}. Disable Safe Mode to execute this query."
        
        # In safe mode, only allow SELECT, INSERT, UPDATE (with WHERE), DELETE (with WHERE)
        allowed_prefixes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH']
        first_word = sql_upper.split()[0] if sql_upper.split() else ''
        
        if first_word not in allowed_prefixes:
            return False, f"Only SELECT, INSERT, UPDATE, DELETE statements are allowed in Safe Mode. Got: {first_word}"
        
        # Check DELETE has WHERE clause
        if first_word == 'DELETE' and 'WHERE' not in sql_upper:
            return False, "DELETE without WHERE clause is blocked in Safe Mode. Disable Safe Mode to execute this query."
    
    return True, ""


def extract_sql_from_response(response_text: str) -> str:
    """Extract SQL from AI response, handling markdown code blocks."""
    # Try to extract from markdown code block
    sql_match = re.search(r'```(?:sql)?\s*(.*?)\s*```', response_text, re.DOTALL | re.IGNORECASE)
    if sql_match:
        return sql_match.group(1).strip()
    
    # If no code block, return the entire response stripped
    return response_text.strip()


def extract_table_name(sql: str) -> str | None:
    """Extract table name from INSERT, UPDATE, or DELETE statement."""
    sql_upper = sql.upper().strip()
    
    # INSERT INTO table_name
    insert_match = re.search(r'INSERT\s+INTO\s+([^\s(]+)', sql, re.IGNORECASE)
    if insert_match:
        return insert_match.group(1).strip()
    
    # UPDATE table_name
    update_match = re.search(r'UPDATE\s+([^\s]+)', sql, re.IGNORECASE)
    if update_match:
        return update_match.group(1).strip()
    
    # DELETE FROM table_name
    delete_match = re.search(r'DELETE\s+FROM\s+([^\s]+)', sql, re.IGNORECASE)
    if delete_match:
        return delete_match.group(1).strip()
    
    return None


@app.post("/ai-query")
async def ai_query(request: AIQueryRequest):
    """
    Process natural language query using AI and execute the generated query.
    Supports both PostgreSQL (SQL) and MongoDB (JSON) queries.
    """
    if not gemini_client:
        return AIQueryErrorResponse(
            success=False,
            error="AI service not configured",
            details="GEMINI_API_KEY not set in environment"
        )
    
    if request.db_type == "mongodb":
        return await _ai_query_mongo(request)
    elif request.db_type == "mysql":
        return await _ai_query_mysql(request)
    else:
        return await _ai_query_postgres(request)


async def _ai_query_mongo(request: AIQueryRequest):
    """Handle AI query for MongoDB."""
    generated_query = None
    try:
        client = get_mongo_client(
            host=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            connection_string=request.connection_string
        )
        db = client[request.database]
        client.admin.command('ping')
        schemas = get_mongo_schema(db)
        
        schema_context = format_mongo_schema_for_ai(schemas)
        
        ai_prompt = f"""You are a MongoDB expert. Given the following MongoDB collection structure and a natural language request, generate a valid MongoDB query in JSON format.

{schema_context}

User request: {request.prompt}

Rules:
1. Return ONLY a valid JSON object, no explanations
2. Use this exact JSON format: {{"collection": "collection_name", "operation": "find|findOne|aggregate|countDocuments|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany", "filter": {{}}, "projection": {{}}, "pipeline": [], "document": {{}}, "update": {{}}, "limit": 100}}
3. Only include relevant fields for the operation (e.g., "filter" for find, "pipeline" for aggregate, "document" for insertOne)
4. For find operations, include a "limit" field (default 100 if not specified)
5. Use proper MongoDB query operators ($gt, $lt, $in, $regex, etc.)

JSON query:"""

        response = gemini_client.models.generate_content(
            model='gemini-flash-latest',
            contents=ai_prompt
        )
        
        if not response.text:
            return AIQueryErrorResponse(
                success=False,
                error="AI failed to generate query",
                details="Empty response from AI model"
            )
        
        generated_query = extract_mongo_query_from_response(response.text)
        
        # Validate the query
        is_valid, validation_error = validate_mongo_query(generated_query, request.safe_mode)
        if not is_valid:
            return AIQueryErrorResponse(
                success=False,
                query=generated_query,
                error="Generated query failed validation",
                details=validation_error
            )
        
        # Parse and execute
        query_obj = json.loads(generated_query)
        collection_name = query_obj.get('collection', '')
        operation = query_obj.get('operation', 'find')
        coll = db[collection_name]
        
        result = _execute_mongo_operation(coll, operation, query_obj)
        client.close()
        
        if isinstance(result, list):
            rows = [serialize_mongo_doc(doc) for doc in result]
            columns = list(set().union(*(doc.keys() for doc in rows))) if rows else []
            return AIQuerySuccessResponse(
                success=True,
                query=generated_query,
                columns=columns,
                rows=rows
            )
        else:
            # For write operations, fetch the collection to show current state
            try:
                sample = list(coll.find().limit(100))
                rows = [serialize_mongo_doc(doc) for doc in sample]
                columns = list(set().union(*(doc.keys() for doc in rows))) if rows else []
                return AIQuerySuccessResponse(
                    success=True,
                    query=generated_query,
                    affected_rows=result if isinstance(result, int) else 0,
                    columns=columns,
                    rows=rows
                )
            except Exception:
                return AIQuerySuccessResponse(
                    success=True,
                    query=generated_query,
                    affected_rows=result if isinstance(result, int) else 0
                )
        
    except (ConnectionFailure, ConfigurationError) as e:
        return AIQueryErrorResponse(
            success=False,
            error="Database connection failed",
            details=parse_mongo_error(e)
        )
    except json.JSONDecodeError as e:
        return AIQueryErrorResponse(
            success=False,
            query=generated_query,
            error="AI generated invalid JSON query",
            details=str(e)
        )
    except Exception as e:
        return AIQueryErrorResponse(
            success=False,
            query=generated_query,
            error="Unexpected error",
            details=str(e)
        )


async def _ai_query_postgres(request: AIQueryRequest):
    """Handle AI query for PostgreSQL."""
    generated_sql = None
    try:
        # Connect and get schema
        with get_db_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        ) as conn:
            schemas = get_schemas_and_tables(conn)
        
        # Format schema for AI context
        schema_context = format_schema_for_ai(schemas)
        
        # Build prompt for Gemini
        ai_prompt = f"""You are a PostgreSQL SQL expert. Given the following database schema and a natural language request, generate a valid PostgreSQL SQL query.

{schema_context}

User request: {request.prompt}

Rules:
1. Return ONLY the SQL query, no explanations
2. Use proper PostgreSQL syntax
3. Include appropriate LIMIT clauses for SELECT queries (default to 100 if not specified)
4. Use schema-qualified table names if needed (e.g., schema_name.table_name)
5. For the "public" schema, you can omit the schema prefix

SQL query:"""

        # Call Gemini API
        response = gemini_client.models.generate_content(
            model='gemini-flash-latest',
            contents=ai_prompt
        )
        
        if not response.text:
            return AIQueryErrorResponse(
                success=False,
                error="AI failed to generate SQL",
                details="Empty response from AI model"
            )
        
        # Extract SQL from response
        generated_sql = extract_sql_from_response(response.text)
        
        # Validate the generated SQL
        is_valid, validation_error = validate_sql(generated_sql, request.safe_mode)
        if not is_valid:
            return AIQueryErrorResponse(
                success=False,
                query=generated_sql,
                error="Generated SQL failed validation",
                details=validation_error
            )
        
        # Execute the SQL
        with get_db_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        ) as conn:
            with conn.cursor() as cursor:
                cursor.execute(generated_sql)
                
                if cursor.description:
                    # SELECT query - return results
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()
                    row_dicts = [dict(zip(columns, row)) for row in rows]
                    
                    return AIQuerySuccessResponse(
                        success=True,
                        query=generated_sql,
                        columns=columns,
                        rows=row_dicts
                    )
                else:
                    # INSERT/UPDATE/DELETE - commit and fetch affected table
                    conn.commit()
                    affected_count = cursor.rowcount
                    
                    # Try to fetch the affected table
                    table_name = extract_table_name(generated_sql)
                    if table_name:
                        try:
                            # Fetch the updated table data
                            cursor.execute(f"SELECT * FROM {table_name} LIMIT 100;")
                            if cursor.description:
                                columns = [desc[0] for desc in cursor.description]
                                rows = cursor.fetchall()
                                row_dicts = [dict(zip(columns, row)) for row in rows]
                                
                                return AIQuerySuccessResponse(
                                    success=True,
                                    query=generated_sql,
                                    affected_rows=affected_count,
                                    columns=columns,
                                    rows=row_dicts
                                )
                        except Exception:
                            # If fetching table fails, just return affected rows
                            pass
                    
                    return AIQuerySuccessResponse(
                        success=True,
                        query=generated_sql,
                        affected_rows=affected_count
                    )
                    
    except OperationalError as e:
        error_message = parse_connection_error(e)
        return AIQueryErrorResponse(
            success=False,
            error="Database connection failed",
            details=error_message
        )
    except Error as e:
        return AIQueryErrorResponse(
            success=False,
            query=generated_sql if 'generated_sql' in locals() else None,
            error="SQL execution failed",
            details=str(e)
        )
    except Exception as e:
        return AIQueryErrorResponse(
            success=False,
            error="Unexpected error",
            details=str(e)
        )


async def _ai_query_mysql(request: AIQueryRequest):
    """Handle AI query for MySQL."""
    generated_sql = None
    try:
        conn = get_mysql_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        )
        try:
            schemas = get_mysql_schemas_and_tables(conn)
        finally:
            conn.close()

        schema_context = format_mysql_schema_for_ai(schemas)

        ai_prompt = f"""You are a MySQL SQL expert. Given the following database schema and a natural language request, generate a valid MySQL SQL query.

{schema_context}

User request: {request.prompt}

Rules:
1. Return ONLY the SQL query, no explanations
2. Use proper MySQL syntax
3. Include appropriate LIMIT clauses for SELECT queries (default to 100 if not specified)
4. Use backticks for identifiers if they are reserved words

SQL query:"""

        response = gemini_client.models.generate_content(
            model='gemini-flash-latest',
            contents=ai_prompt
        )

        if not response.text:
            return AIQueryErrorResponse(
                success=False,
                error="AI failed to generate SQL",
                details="Empty response from AI model"
            )

        generated_sql = extract_sql_from_response(response.text)

        is_valid, validation_error = validate_sql(generated_sql, request.safe_mode)
        if not is_valid:
            return AIQueryErrorResponse(
                success=False,
                query=generated_sql,
                error="Generated SQL failed validation",
                details=validation_error
            )

        conn = get_mysql_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        )
        try:
            statements = _split_sql_statements(generated_sql)
            last_select_result = None
            total_affected = 0

            with conn.cursor() as cursor:
                for stmt in statements:
                    cursor.execute(stmt)

                    if cursor.description:
                        columns = [desc[0] for desc in cursor.description]
                        rows = cursor.fetchall()
                        row_dicts = [dict(zip(columns, row)) for row in rows]
                        last_select_result = (columns, row_dicts)
                    else:
                        total_affected += cursor.rowcount

                conn.commit()

            if last_select_result:
                columns, row_dicts = last_select_result
                return AIQuerySuccessResponse(
                    success=True,
                    query=generated_sql,
                    columns=columns,
                    rows=row_dicts
                )
            else:
                # After DML, try to show the affected table
                table_name = extract_table_name(generated_sql)
                if table_name:
                    try:
                        with conn.cursor() as cursor:
                            cursor.execute(f"SELECT * FROM `{table_name}` LIMIT 100;")
                            if cursor.description:
                                columns = [desc[0] for desc in cursor.description]
                                rows = cursor.fetchall()
                                row_dicts = [dict(zip(columns, row)) for row in rows]
                                return AIQuerySuccessResponse(
                                    success=True,
                                    query=generated_sql,
                                    affected_rows=total_affected,
                                    columns=columns,
                                    rows=row_dicts
                                )
                    except Exception:
                        pass

                return AIQuerySuccessResponse(
                    success=True,
                    query=generated_sql,
                    affected_rows=total_affected
                )
        finally:
            conn.close()

    except pymysql.Error as e:
        return AIQueryErrorResponse(
            success=False,
            query=generated_sql,
            error="MySQL error",
            details=str(e)
        )
    except Exception as e:
        return AIQueryErrorResponse(
            success=False,
            error="Unexpected error",
            details=str(e)
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
