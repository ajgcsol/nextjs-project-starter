'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bug,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Settings,
  Database,
  Zap,
  Activity,
  AlertCircle,
  Info,
  Terminal,
  FileText
} from 'lucide-react';

interface DebugEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  category: 'upload' | 'processing' | 'transcription' | 'database' | 'mux' | 'api';
  message: string;
  videoId?: string;
  videoTitle?: string;
  details?: any;
  stackTrace?: string;
  resolved?: boolean;
}

interface ProcessingStats {
  totalProcessing: number;
  totalErrors: number;
  totalWarnings: number;
  avgProcessingTime: number;
  successRate: number;
  recentActivity: number;
}

export function ProcessingDebugMonitor() {
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [stats, setStats] = useState<ProcessingStats>({
    totalProcessing: 0,
    totalErrors: 0,
    totalWarnings: 0,
    avgProcessingTime: 0,
    successRate: 0,
    recentActivity: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    level: 'all',
    category: 'all',
    search: '',
    resolved: 'all'
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DebugEntry | null>(null);

  // Fetch debug data
  const fetchDebugData = async () => {
    try {
      setIsLoading(true);
      
      const [debugResponse, statsResponse] = await Promise.all([
        fetch('/api/debug/processing-logs'),
        fetch('/api/debug/processing-stats')
      ]);
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        setDebugEntries(debugData.entries || []);
      }
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || stats);
      }
      
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    fetchDebugData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDebugData, 15000); // 15 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filter debug entries
  const filteredEntries = debugEntries.filter(entry => {
    if (filter.level !== 'all' && entry.level !== filter.level) return false;
    if (filter.category !== 'all' && entry.category !== filter.category) return false;
    if (filter.resolved !== 'all') {
      const isResolved = entry.resolved === true;
      if (filter.resolved === 'resolved' && !isResolved) return false;
      if (filter.resolved === 'unresolved' && isResolved) return false;
    }
    if (filter.search && !entry.message.toLowerCase().includes(filter.search.toLowerCase()) &&
        !entry.videoTitle?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    
    return true;
  });

  // Get level icon and color
  const getLevelIcon = (level: DebugEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'debug':
        return <Bug className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLevelBadge = (level: DebugEntry['level']) => {
    const colors = {
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800',
      debug: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[level]}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const getCategoryIcon = (category: DebugEntry['category']) => {
    switch (category) {
      case 'upload':
        return <RefreshCw className="h-3 w-3" />;
      case 'processing':
        return <Zap className="h-3 w-3" />;
      case 'transcription':
        return <FileText className="h-3 w-3" />;
      case 'database':
        return <Database className="h-3 w-3" />;
      case 'mux':
        return <Activity className="h-3 w-3" />;
      case 'api':
        return <Terminal className="h-3 w-3" />;
    }
  };

  // Mark entry as resolved
  const markResolved = async (entryId: string) => {
    try {
      const response = await fetch(`/api/debug/processing-logs/${entryId}/resolve`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setDebugEntries(prev => prev.map(entry => 
          entry.id === entryId ? { ...entry, resolved: true } : entry
        ));
      }
    } catch (error) {
      console.error('Error marking entry as resolved:', error);
    }
  };

  // Clear old entries
  const clearOldEntries = async () => {
    try {
      const response = await fetch('/api/debug/processing-logs/cleanup', {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchDebugData();
      }
    } catch (error) {
      console.error('Error clearing old entries:', error);
    }
  };

  // Export debug data
  const exportDebugData = () => {
    const dataStr = JSON.stringify(filteredEntries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `processing-debug-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeDiff = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold">{stats.totalProcessing}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalErrors}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Time</p>
                <p className="text-2xl font-bold">{stats.avgProcessingTime}s</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Debug Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Processing Debug Monitor
              </CardTitle>
              <CardDescription>
                Monitor and debug video processing pipeline issues
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDebugData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="logs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="logs">Debug Logs</TabsTrigger>
              <TabsTrigger value="filters">Filters & Search</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="filters" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="level-filter">Level</Label>
                  <select 
                    id="level-filter"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={filter.level}
                    onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value }))}
                  >
                    <option value="all">All Levels</option>
                    <option value="error">Errors</option>
                    <option value="warning">Warnings</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="category-filter">Category</Label>
                  <select
                    id="category-filter"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={filter.category}
                    onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="all">All Categories</option>
                    <option value="upload">Upload</option>
                    <option value="processing">Processing</option>
                    <option value="transcription">Transcription</option>
                    <option value="database">Database</option>
                    <option value="mux">Mux</option>
                    <option value="api">API</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="resolved-filter">Status</Label>
                  <select
                    id="resolved-filter"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={filter.resolved}
                    onChange={(e) => setFilter(prev => ({ ...prev, resolved: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="resolved">Resolved</option>
                    <option value="unresolved">Unresolved</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search messages..."
                    value={filter.search}
                    onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="actions" className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  onClick={exportDebugData}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Debug Data
                </Button>
                
                <Button
                  variant="outline"
                  onClick={clearOldEntries}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Old Entries
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open('/api/debug/processing-stats', '_blank')}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Raw Stats
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="logs" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {filteredEntries.length} of {debugEntries.length} entries
                </p>
                <Badge variant="secondary">
                  {debugEntries.filter(e => !e.resolved && e.level === 'error').length} unresolved errors
                </Badge>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      entry.resolved ? 'opacity-60' : ''
                    } ${
                      entry.level === 'error' ? 'border-red-200 bg-red-50' :
                      entry.level === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      'border-gray-200'
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          {getLevelIcon(entry.level)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getLevelBadge(entry.level)}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {getCategoryIcon(entry.category)}
                              <span>{entry.category}</span>
                            </div>
                            {entry.videoTitle && (
                              <Badge variant="outline" className="text-xs">
                                {entry.videoTitle}
                              </Badge>
                            )}
                            {entry.resolved && (
                              <Badge variant="secondary" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {entry.message}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatTimestamp(entry.timestamp)}</span>
                            <span>{getTimeDiff(entry.timestamp)}</span>
                            {entry.videoId && (
                              <span>Video: {entry.videoId.substring(0, 8)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!entry.resolved && entry.level === 'error' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markResolved(entry.id);
                            }}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Bug className="h-8 w-8 mx-auto mb-2" />
                    <p>No debug entries found matching your filters</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected Entry Details Modal */}
      {selectedEntry && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getLevelIcon(selectedEntry.level)}
                Debug Entry Details
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Level</Label>
                <div className="mt-1">{getLevelBadge(selectedEntry.level)}</div>
              </div>
              
              <div>
                <Label>Category</Label>
                <div className="mt-1 flex items-center gap-2">
                  {getCategoryIcon(selectedEntry.category)}
                  <span className="capitalize">{selectedEntry.category}</span>
                </div>
              </div>
              
              <div>
                <Label>Timestamp</Label>
                <p className="mt-1 text-sm">{formatTimestamp(selectedEntry.timestamp)}</p>
              </div>
              
              <div>
                <Label>Video ID</Label>
                <p className="mt-1 text-sm font-mono">{selectedEntry.videoId || 'N/A'}</p>
              </div>
            </div>
            
            <div>
              <Label>Message</Label>
              <p className="mt-1 text-sm p-3 bg-gray-50 rounded border">
                {selectedEntry.message}
              </p>
            </div>
            
            {selectedEntry.details && (
              <div>
                <Label>Details</Label>
                <pre className="mt-1 text-xs p-3 bg-gray-50 rounded border overflow-x-auto">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedEntry.stackTrace && (
              <div>
                <Label>Stack Trace</Label>
                <pre className="mt-1 text-xs p-3 bg-gray-50 rounded border overflow-x-auto">
                  {selectedEntry.stackTrace}
                </pre>
              </div>
            )}
            
            {!selectedEntry.resolved && selectedEntry.level === 'error' && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    markResolved(selectedEntry.id);
                    setSelectedEntry(null);
                  }}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ProcessingDebugMonitor;