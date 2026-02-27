from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2 import OperationalError, Error
from typing import List, Optional
from contextlib import contextmanager

app = FastAPI(
    title="PostgreSQL Connection Tester",
    description="API to test PostgreSQL database connections and fetch schema information",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionRequest(BaseModel):
    host: str = Field(..., description="Database host address")
    port: int = Field(default=5432, description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")


class TableSchema(BaseModel):
    schema_name: str
    tables: List[str]


class ConnectionSuccessResponse(BaseModel):
    success: bool = True
    schemas: List[TableSchema]


class ConnectionErrorResponse(BaseModel):
    success: bool = False
    error: str


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


def get_schemas_and_tables(conn) -> List[TableSchema]:
    """Fetch all non-system schemas and their tables."""
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
    
    result = []
    
    with conn.cursor() as cursor:
        # Fetch all schemas
        cursor.execute(schemas_query)
        schemas = cursor.fetchall()
        
        # For each schema, fetch its tables
        for (schema_name,) in schemas:
            cursor.execute(tables_query, (schema_name,))
            tables = [table[0] for table in cursor.fetchall()]
            result.append(TableSchema(schema_name=schema_name, tables=tables))
    
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
            return ConnectionSuccessResponse(success=True, schemas=schemas)
            
    except OperationalError as e:
        error_message = parse_connection_error(e)
        return ConnectionErrorResponse(success=False, error=error_message)
    
    except Error as e:
        return ConnectionErrorResponse(success=False, error=f"Database error: {str(e)}")
    
    except Exception as e:
        return ConnectionErrorResponse(success=False, error=f"Unexpected error: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
