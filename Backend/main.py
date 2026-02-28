from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2 import OperationalError, Error
from typing import List, Optional, Any, Dict
from contextlib import contextmanager
import time
import os
import re
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
    title="PostgreSQL AI Query API",
    description="API for PostgreSQL connections and AI-powered SQL generation",
    version="2.0.0"
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
    host: str = Field(..., description="Database host address")
    port: int = Field(default=5432, description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")


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


class ConnectionErrorResponse(BaseModel):
    success: bool = False
    error: str


class ExecuteRequest(BaseModel):
    sql: str = Field(..., description="SQL query to execute")


class ExecuteResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: float


class AIQueryRequest(BaseModel):
    host: str = Field(..., description="Database host address")
    port: int = Field(default=5432, description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")
    prompt: str = Field(..., description="Natural language query")


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


@contextmanager
def get_db_connection(host: str, port: int, database: str, username: str, password: str):
    """Context manager for database connections."""
    conn = None
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=database,
            user=username,
            password=password,
            connect_timeout=10
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
        return "Invalid host: The hostname could not be resolved"
    elif "connection refused" in error_msg:
        return "Connection refused: Check if PostgreSQL is running on the specified port"
    else:
        return str(error)


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
    Test PostgreSQL database connection and retrieve schema information.
    
    Returns all non-system schemas and their tables if connection is successful.
    """
    try:
        with get_db_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        ) as conn:
            schemas = get_schemas_and_tables(conn)
            
            # Store connection details for later use
            db_connection_store['current'] = {
                'host': request.host,
                'port': request.port,
                'database': request.database,
                'username': request.username,
                'password': request.password
            }
            
            return ConnectionSuccessResponse(success=True, schemas=schemas)
            
    except OperationalError as e:
        error_message = parse_connection_error(e)
        return ConnectionErrorResponse(success=False, error=error_message)
    
    except Error as e:
        return ConnectionErrorResponse(success=False, error=f"Database error: {str(e)}")
    
    except Exception as e:
        return ConnectionErrorResponse(success=False, error=f"Unexpected error: {str(e)}")


@app.post("/execute")
async def execute_sql(request: ExecuteRequest):
    """Execute a SQL query and return results."""
    if 'current' not in db_connection_store:
        raise HTTPException(status_code=400, detail="No database connection. Please connect first.")
    
    conn_details = db_connection_store['current']
    
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
                cursor.execute(request.sql)
                
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


def validate_sql(sql: str) -> tuple[bool, str]:
    """
    Validate SQL query for safety.
    Returns (is_valid, error_message).
    """
    sql_upper = sql.upper().strip()
    
    # Block dangerous operations
    dangerous_patterns = [
        r'\bDROP\s+DATABASE\b',
        r'\bDROP\s+SCHEMA\b.*\bCASCADE\b',
        r'\bTRUNCATE\b',
        r'\bALTER\s+SYSTEM\b',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, sql_upper):
            return False, f"Dangerous operation detected: {pattern}"
    
    # Allow only specific statement types
    allowed_prefixes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH']
    first_word = sql_upper.split()[0] if sql_upper.split() else ''
    
    if first_word not in allowed_prefixes:
        return False, f"Only SELECT, INSERT, UPDATE, DELETE statements are allowed. Got: {first_word}"
    
    return True, ""


def extract_sql_from_response(response_text: str) -> str:
    """Extract SQL from AI response, handling markdown code blocks."""
    # Try to extract from markdown code block
    sql_match = re.search(r'```(?:sql)?\s*(.*?)\s*```', response_text, re.DOTALL | re.IGNORECASE)
    if sql_match:
        return sql_match.group(1).strip()
    
    # If no code block, return the entire response stripped
    return response_text.strip()


@app.post("/ai-query")
async def ai_query(request: AIQueryRequest):
    """
    Process natural language query using AI and execute generated SQL.
    """
    if not gemini_client:
        return AIQueryErrorResponse(
            success=False,
            error="AI service not configured",
            details="GEMINI_API_KEY not set in environment"
        )
    
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
            model='gemini-2.0-flash',
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
        is_valid, validation_error = validate_sql(generated_sql)
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
                    # INSERT/UPDATE/DELETE - commit and return affected rows
                    conn.commit()
                    return AIQuerySuccessResponse(
                        success=True,
                        query=generated_sql,
                        affected_rows=cursor.rowcount
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


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
