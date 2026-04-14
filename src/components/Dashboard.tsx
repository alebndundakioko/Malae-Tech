import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Clock, 
  FileText, 
  ChevronRight, 
  Filter, 
  ArrowUpRight,
  Activity,
  Users,
  Database,
  Calendar,
  MoreHorizontal,
  Trash2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Report } from '../types';
import { auth } from '../firebase';

interface DashboardProps {
  reports: Report[];
  user: any;
  onSelectReport: (report: Report) => void;
  onNewReport: () => void;
  onDeleteReport: (id: string) => void;
  onInviteCollaborator: (reportId: string, email: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  reports = [], 
  user,
  onSelectReport, 
  onNewReport,
  onDeleteReport,
  onInviteCollaborator
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent' | 'finalized' | 'shared'>('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedReportForInvite, setSelectedReportForInvite] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const patientName = report.patientName || report.patientData?.fullName || 'Unknown Patient';
      const diagnosis = report.diagnosis || report.reportData?.impression || '';
      
      const matchesSearch = patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'all') return true;
      if (filter === 'recent') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const reportDate = report.createdAt?.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        return reportDate > oneWeekAgo;
      }
      if (filter === 'finalized') {
        return report.type === 'story';
      }
      if (filter === 'shared') {
        return report.collaborators && report.collaborators.length > 0;
      }
      return true;
    });
  }, [reports, searchQuery, filter]);

  const stats = [
    { label: 'Total Cases', value: reports.length, icon: Database, color: 'text-primary', filter: 'all' as const },
    { 
      label: 'Active Insights', 
      value: reports.filter(r => r.diagnosis || r.reportData?.impression || r.type === 'story').length, 
      icon: Activity, 
      color: 'text-emerald-500',
      filter: 'finalized' as const
    },
    { 
      label: 'Collaborators', 
      value: new Set(reports.flatMap(r => r.collaborators || []).filter(email => email !== user?.email)).size, 
      icon: Users, 
      color: 'text-blue-500',
      filter: 'shared' as const
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = auth.currentUser?.displayName?.split(' ')[0] || 'Doctor';
    if (hour < 12) return `Good morning, Dr. ${name}`;
    if (hour < 17) return `Good afternoon, Dr. ${name}`;
    return `Good evening, Dr. ${name}`;
  };

  return (
    <div className="min-h-screen bg-bg p-6 lg:p-10 space-y-10">
      {/* Top Navigation / Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-main tracking-tight">{getGreeting()}</h1>
          <p className="text-text-muted font-medium">Your clinical command center is synchronized.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search clinical records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-6 py-3 bg-surface border border-line rounded-2xl w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={onNewReport}
            className="flex items-center justify-center gap-2 px-6 py-3 pink-gradient text-white rounded-2xl font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            New Case
          </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Stats Panel */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <button
              key={stat.label}
              onClick={() => setFilter(stat.filter)}
              className={`glass-card p-6 rounded-3xl pink-glow group cursor-pointer transition-all border-2 text-left w-full active:scale-[0.98] ${
                filter === stat.filter ? 'border-primary shadow-lg shadow-primary/5' : 'border-transparent hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-bg ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className={`w-4 h-4 transition-all ${
                  filter === stat.filter ? 'text-primary opacity-100' : 'text-text-muted opacity-0 group-hover:opacity-100'
                }`} />
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-bold text-text-main block">{stat.value}</span>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Insights Panel */}
        <div className="lg:col-span-4 glass-card p-8 rounded-3xl pink-glow flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">AI Insights</span>
            </div>
            <h3 className="text-xl font-bold text-text-main leading-tight">
              {stats[1].value > 0 
                ? `You have ${stats[1].value} clinical insight${stats[1].value > 1 ? 's' : ''} ready for review.`
                : "Generate a Case Story to see AI-powered clinical insights here."}
            </h3>
          </div>
          <div className="mt-8 pt-6 border-t border-line">
            <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              <span>Weekly Goal</span>
              <span>{reports.length}/15 Cases</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div className="h-full pink-gradient transition-all duration-500" style={{ width: `${Math.min((reports.length / 15) * 100, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Clinical Archive Section */}
        <div className="lg:col-span-12 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-text-main">Clinical Archive</h2>
              <div className="flex bg-surface border border-line p-1 rounded-xl">
                {(['all', 'recent', 'finalized', 'shared'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      filter === t ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest hover:gap-3 transition-all active:scale-95 py-2 px-4 rounded-xl hover:bg-primary/5"
            >
              View All Records <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report, idx) => {
                const patientName = report.patientName || report.patientData?.fullName || 'Unknown Patient';
                const diagnosis = report.diagnosis || report.reportData?.impression || 'No diagnosis recorded';
                const reportDate = report.createdAt?.toDate ? report.createdAt.toDate() : new Date(report.createdAt);

                return (
                  <motion.div
                    layout
                    key={report.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSelectReport(report)}
                    className="group glass-card p-6 rounded-3xl cursor-pointer hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteReport(report.id);
                        }}
                        className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="p-3 rounded-2xl bg-bg text-primary">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            {format(reportDate, 'MMM dd, yyyy')}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${report.type === 'story' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${report.type === 'story' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {report.type === 'story' ? 'Finalized' : 'Draft'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-text-main group-hover:text-primary transition-colors truncate">
                          {patientName}
                        </h3>
                        <p className="text-sm text-text-muted font-medium line-clamp-1">
                          {diagnosis}
                        </p>
                      </div>

                      <div className="pt-6 border-t border-line flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-text-muted" />
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            {format(reportDate, 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {report.collaborators?.slice(0, 3).map((email, i) => (
                              <div key={i} className="w-6 h-6 rounded-full border-2 border-surface bg-bg flex items-center justify-center text-[8px] font-bold text-text-muted" title={email}>
                                {email[0].toUpperCase()}
                              </div>
                            ))}
                            {(report.collaborators?.length || 0) > 3 && (
                              <div className="w-6 h-6 rounded-full border-2 border-surface bg-bg flex items-center justify-center text-[8px] font-bold text-text-muted">
                                +{(report.collaborators?.length || 0) - 3}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const email = prompt("Enter collaborator's email:");
                              if (email) onInviteCollaborator(report.id, email);
                            }}
                            className="p-1.5 rounded-lg bg-bg text-text-muted hover:text-primary hover:bg-primary/5 transition-all active:scale-90"
                            title="Invite Collaborator"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty State / Add Card */}
              {filteredReports.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 glass-card rounded-3xl border-dashed border-2">
                  <div className="p-4 rounded-full bg-bg text-primary">
                    <Search className="w-8 h-8 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-text-main font-bold">No clinical records found</p>
                    <p className="text-text-muted text-sm font-medium">Try adjusting your search or filters</p>
                  </div>
                  <button 
                    onClick={onNewReport}
                    className="px-6 py-2.5 bg-primary/10 text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95"
                  >
                    Create New Case
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
