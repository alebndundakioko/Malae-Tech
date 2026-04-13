import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Trash2, 
  Calendar, 
  ChevronRight, 
  Search,
  Plus,
  Clock,
  User as UserIcon,
  Filter,
  MoreVertical,
  ArrowUpRight,
  Activity,
  ArrowUpDown,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Heart
} from 'lucide-react';
import { Loader } from './Loader';

interface DashboardProps {
  onNewReport: () => void;
  onViewReport: (report: any) => void;
  onConfirmDelete: (onConfirm: () => void) => void;
}

const getInitials = (name: string) => {
  if (!name) return 'N/A';
  return name.split(' ').map(n => n[0]).join('.').toUpperCase();
};

export const Dashboard = ({ onNewReport, onViewReport, onConfirmDelete }: DashboardProps) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'original' | 'story'>('all');
  const [sortBy, setSortBy] = useState<'date-newest' | 'date-oldest' | 'type-story' | 'type-original'>('date-newest');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    const path = 'reports';
    try {
      const q = query(
        collection(db, 'reports'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedReports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(fetchedReports);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      // Small delay for a smoother "human" feel
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    
    onConfirmDelete(async () => {
      const path = `reports/${reportId}`;
      try {
        await deleteDoc(doc(db, 'reports', reportId));
        setReports(reports.filter(r => r.id !== reportId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    });
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.patientData?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || report.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const sortedReports = [...filteredReports].sort((a, b) => {
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;

    switch (sortBy) {
      case 'date-newest':
        return dateB - dateA;
      case 'date-oldest':
        return dateA - dateB;
      case 'type-story':
        if (a.type === b.type) return dateB - dateA;
        return a.type === 'story' ? -1 : 1;
      case 'type-original':
        if (a.type === b.type) return dateB - dateA;
        return a.type === 'original' ? -1 : 1;
      default:
        return 0;
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-full bg-[#FDFCFB] selection:bg-[#AE6965]/10">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 sm:py-16 relative z-10 space-y-12 sm:space-y-20">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-8"
        >
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 text-[#AE6965] font-bold text-[10px] uppercase tracking-[0.3em]"
            >
              <div className="w-8 h-[1px] bg-[#AE6965]/30" />
              Clinical Archive
            </motion.div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-widest uppercase leading-[1.1]">
              {getGreeting()}, <br className="hidden sm:block" />
              <span className="text-slate-400">{auth.currentUser?.displayName?.split(' ')[0] || 'Professional'}</span>
            </h1>
            <p className="text-sm sm:text-lg text-slate-500 max-w-xl font-medium leading-relaxed">
              You have documented <span className="text-slate-900 font-bold">{reports.length} clinical cases</span> in your private workspace.
            </p>
          </div>
        </motion.div>

        {/* Stats Grid - Refined */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2 bg-white p-8 sm:p-10 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="flex items-end gap-4 mb-8">
              <span className="text-6xl sm:text-8xl font-black text-slate-900">{reports.length}</span>
              <div className="flex flex-col mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Records</span>
                <span className="text-xs font-medium text-slate-500">Documented to date</span>
              </div>
            </div>
            <div className="flex items-center gap-8 pt-8 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900">{reports.filter(r => r.type === 'story').length}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">AI Case Stories</span>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900">{reports.filter(r => r.type === 'original').length}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clinical Records</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#AE6965] p-8 sm:p-10 rounded-2xl shadow-xl shadow-[#AE6965]/10 text-white flex flex-col justify-between relative overflow-hidden group"
          >
            <div>
              <Sparkles className="w-8 h-8 mb-6 opacity-50" />
              <h3 className="text-2xl font-black uppercase tracking-widest mb-3">AI Synthesis</h3>
              <p className="text-white/80 text-sm leading-relaxed font-medium">
                Transform your raw clinical notes into professional, structured narratives.
              </p>
            </div>
            <button 
              onClick={onNewReport}
              className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest group/btn"
            >
              Start Writing
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8 sm:space-y-12">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900">Archive</h2>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                {(['all', 'original', 'story'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`whitespace-nowrap px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      filterType === type 
                        ? 'bg-white text-[#AE6965] shadow-sm border border-slate-100' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {type === 'all' ? 'All' : type === 'original' ? 'Clinical' : 'Stories'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  placeholder="Search archive..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white text-sm font-medium focus:outline-none focus:border-[#AE6965] transition-all shadow-sm"
                />
              </div>
              
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full sm:w-auto pl-4 pr-10 py-3 rounded-xl border border-slate-100 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-600 focus:outline-none cursor-pointer appearance-none shadow-sm hover:border-[#AE6965]/30 transition-colors"
                >
                  <option value="date-newest">Newest First</option>
                  <option value="date-oldest">Oldest First</option>
                  <option value="type-story">Stories First</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 rotate-90 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center">
                <Loader />
                <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] animate-pulse">Syncing Records</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* New Case Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onNewReport}
                  className="group bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#AE6965] hover:bg-white transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-6 min-h-[320px]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:bg-[#AE6965] group-hover:text-white transition-all duration-500">
                    <Plus className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 mb-2">Start New Case</h3>
                    <p className="text-xs text-slate-400 font-medium max-w-[200px]">Begin documenting a new clinical encounter with AI assistance.</p>
                  </div>
                </motion.div>

                <AnimatePresence mode="popLayout">
                  {sortedReports.map((report, idx) => (
                    <motion.div
                      key={report.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => onViewReport(report)}
                      className="group bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-6">
                          <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500
                            ${report.type === 'story' 
                              ? 'bg-[#AE6965]/5 text-[#AE6965] group-hover:bg-[#AE6965] group-hover:text-white' 
                              : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white'}
                          `}>
                            {report.type === 'story' ? <Sparkles className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                          </div>
                          <button
                            onClick={(e) => handleDelete(e, report.id)}
                            className="p-2 text-slate-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                              report.type === 'story' 
                                ? 'bg-[#AE6965]/5 text-[#AE6965] border-[#AE6965]/10' 
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                              {report.type === 'story' ? 'Story' : 'Clinical'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                              {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                            </span>
                          </div>
                          
                          <h3 className="text-xl font-bold uppercase tracking-widest text-slate-900 group-hover:text-[#AE6965] transition-colors line-clamp-2 leading-tight">
                            {report.title}
                          </h3>

                          <div className="flex items-center gap-2 pt-2">
                            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-[8px] font-bold text-slate-400 border border-slate-100">
                              {getInitials(report.patientData?.fullName)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                              {report.patientData?.fullName || 'Anonymous'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-[#AE6965] transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-20 flex flex-col md:flex-row items-center justify-between gap-8 px-4">
          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              System Online
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span>v2.5.0 Clinical</span>
          </div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center md:text-right">
            Secure medical workspace for modern healthcare professionals.
          </p>
        </div>
      </div>
    </div>
  );
};
