import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Trash2, 
  Calendar, 
  ChevronRight, 
  Search,
  Plus,
  Loader2,
  Clock,
  User as UserIcon,
  Filter,
  MoreVertical,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Heart
} from 'lucide-react';

interface DashboardProps {
  onNewReport: () => void;
  onViewReport: (report: any) => void;
  onConfirmDelete: (onConfirm: () => void) => void;
}

export const Dashboard = ({ onNewReport, onViewReport, onConfirmDelete }: DashboardProps) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'original' | 'story'>('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
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
      console.error("Error fetching reports:", error);
    } finally {
      // Small delay for a smoother "human" feel
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    
    onConfirmDelete(async () => {
      try {
        await deleteDoc(doc(db, 'reports', reportId));
        setReports(reports.filter(r => r.id !== reportId));
      } catch (error) {
        console.error("Error deleting report:", error);
      }
    });
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.patientData?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || report.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#8B5E3C] font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em]">
            <Heart className="w-4 h-4 fill-[#8B5E3C]" />
            Welcome back
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {getGreeting()}, <span className="text-[#8B5E3C]">{auth.currentUser?.displayName?.split(' ')[0] || 'Doctor'}</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-md">
            Here's a look at your clinical archive. Ready to synthesize a new case?
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onNewReport}
            className="w-full sm:w-auto group relative bg-[#8B5E3C] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold shadow-xl shadow-[#8B5E3C]/20 hover:shadow-2xl hover:shadow-[#8B5E3C]/30 transition-all flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Start New Case</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
        {[
          { 
            label: 'Your Case Archive', 
            value: reports.length, 
            icon: FileText, 
            color: 'blue',
            desc: 'Total records saved'
          },
          { 
            label: 'AI Case Stories', 
            value: reports.filter(r => r.type === 'story').length, 
            icon: Sparkles, 
            color: 'emerald',
            desc: 'Synthesized narratives'
          },
          { 
            label: 'Clinical Activity', 
            value: reports.length > 0 ? 'Active' : 'Starting out', 
            icon: Activity, 
            color: 'amber',
            desc: 'Your recent engagement'
          }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${i === 2 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
          >
            <div className={`absolute -right-4 -top-4 w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-${stat.color}-50/50 group-hover:scale-110 transition-transform duration-500`} />
            <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4 sm:mb-6 relative z-10`}>
              <stat.icon className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
              <p className="text-slate-400 text-[10px] sm:text-xs">{stat.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 sm:p-8 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Your Saved Cases</h2>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 self-start">
              {(['all', 'original', 'story'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${
                    filterType === type 
                      ? 'bg-white text-[#8B5E3C] shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'original' ? 'Clinical' : 'AI Stories'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Find a patient or complaint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-4 focus:ring-[#8B5E3C]/5 focus:border-[#8B5E3C] transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-[#8B5E3C] animate-spin" />
                <Activity className="absolute inset-0 m-auto w-8 h-8 text-[#8B5E3C] animate-pulse" />
              </div>
              <p className="font-bold text-sm uppercase tracking-[0.2em] text-slate-900">Gathering your records...</p>
              <p className="text-xs mt-2">Just a moment while we fetch your clinical archive.</p>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredReports.map((report, idx) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onViewReport(report)}
                    className="group p-6 lg:p-8 hover:bg-slate-50/80 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-6 flex-1">
                      <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300
                        ${report.type === 'story' 
                          ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] group-hover:bg-[#8B5E3C] group-hover:text-white' 
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'}
                      `}>
                        {report.type === 'story' ? <Sparkles className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                      </div>
                      
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#8B5E3C] transition-colors truncate">
                            {report.title}
                          </h3>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.15em] border ${
                            report.type === 'story' 
                              ? 'bg-[#8B5E3C]/5 text-[#8B5E3C] border-[#8B5E3C]/20' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {report.type === 'story' ? 'AI Synthesis' : 'Clinical Data'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <UserIcon className="w-3.5 h-3.5 text-slate-300" />
                            <span className="font-semibold">{report.patientData?.fullName || 'Unidentified Patient'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                            <span>{report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                          </div>
                        </div>

                        {report.hpcNarrative && (
                          <p className="text-xs text-slate-400 line-clamp-1 italic mt-2">
                            "{report.hpcNarrative}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDelete(e, report.id)}
                          className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                      <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-[#8B5E3C] group-hover:text-[#8B5E3C] transition-all">
                        <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-32 text-center px-6">
              <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-8 text-slate-200 group">
                <BookOpen className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Your archive is empty</h3>
              <p className="text-slate-500 mb-10 max-w-xs mx-auto">Ready to document your first case? We'll help you synthesize the data into a professional story.</p>
              <button
                onClick={onNewReport}
                className="inline-flex items-center gap-2 text-[#8B5E3C] font-black uppercase tracking-widest text-xs hover:gap-4 transition-all"
              >
                Start Your First Case
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Malae is Online
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-200" />
          <span>v2.5.0 Clinical</span>
        </div>
        <p className="text-[10px] font-medium text-slate-400">
          Secure clinical intelligence for modern physicians.
        </p>
      </div>
    </div>
  );
};
