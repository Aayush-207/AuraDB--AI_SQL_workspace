import { useState, useEffect } from 'react';
import { Activity, Database, Server, Clock } from 'lucide-react';

interface StatusBarProps {
  isConnected: boolean;
}

const StatusBar = ({ isConnected }: StatusBarProps) => {
  const [postgresVersion, setPostgresVersion] = useState<string>('');
  const [dbConnection, setDbConnection] = useState<{ host?: string; database?: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const version = sessionStorage.getItem('postgresVersion');
    const connection = sessionStorage.getItem('dbConnection');
    const storedDbType = sessionStorage.getItem('dbType') || 'postgresql';
    
    if (version) {
      if (storedDbType === 'mongodb') {
        // MongoDB version is already formatted as "MongoDB X.X.X"
        setPostgresVersion(version);
      } else if (storedDbType === 'mysql') {
        // MySQL version is already formatted as "MySQL X.X.X"
        setPostgresVersion(version);
      } else {
        // Extract just the major version info (e.g., "PostgreSQL 15.2")
        const match = version.match(/PostgreSQL\s+[\d.]+/i);
        setPostgresVersion(match ? match[0] : version.split(' ').slice(0, 2).join(' '));
      }
    }
    
    if (connection) {
      try {
        setDbConnection(JSON.parse(connection));
      } catch (e) {
        console.error('Failed to parse connection:', e);
      }
    }
  }, []);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-6 flex items-center justify-between px-3 bg-sidebar border-t border-border text-[10px] text-muted-foreground">
      {/* Left side - Connection Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {isConnected && dbConnection && (
          <>
            <div className="flex items-center gap-1.5">
              <Server className="w-3 h-3" />
              <span>{dbConnection.host}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              <span>{dbConnection.database}</span>
            </div>
          </>
        )}
      </div>

      {/* Right side - Version & Clock */}
      <div className="flex items-center gap-4">
        {postgresVersion && (
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            <span>{postgresVersion}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
