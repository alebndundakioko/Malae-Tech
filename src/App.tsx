/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Zap, 
  Clock, 
  Stethoscope, 
  ClipboardList, 
  Scissors, 
  Users, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Upload,
  FileText,
  CheckCircle2
} from 'lucide-react';

// --- Types ---

type StepId = 
  | 'demographics' 
  | 'presenting_complaint' 
  | 'hpc_details' 
  | 'review_of_systems' 
  | 'past_medical_hx' 
  | 'past_surgical_hx' 
  | 'family_social_hx';

interface Step {
  id: StepId;
  label: string;
  icon: any;
  title: string;
  subtitle: string;
}

// --- Constants ---

const STEPS: Step[] = [
  { 
    id: 'demographics', 
    label: 'Demographics', 
    icon: User, 
    title: 'Patient Demographics', 
    subtitle: 'Establishing the clinical identity and background profile.' 
  },
  { 
    id: 'presenting_complaint', 
    label: 'Presenting Complaint', 
    icon: Zap, 
    title: 'Presenting Complaint', 
    subtitle: 'The primary symptom reported in the patient\'s own words.' 
  },
  { 
    id: 'hpc_details', 
    label: 'HPC Details', 
    icon: Clock, 
    title: 'History of Presenting Complaint', 
    subtitle: 'Detailed chronological analysis using clinical mnemonics.' 
  },
  { 
    id: 'review_of_systems', 
    label: 'Review of Systems', 
    icon: Stethoscope, 
    title: 'Systemic Review', 
    subtitle: 'Systematic screening for systemic physiological involvement.' 
  },
  { 
    id: 'past_medical_hx', 
    label: 'Past Medical Hx', 
    icon: ClipboardList, 
    title: 'Medical Background', 
    subtitle: 'Historical diagnoses and chronic pharmacotherapy.' 
  },
  { 
    id: 'past_surgical_hx', 
    label: 'Past Surgical Hx', 
    icon: Scissors, 
    title: 'Surgical History', 
    subtitle: 'Previous operative procedures and trauma history.' 
  },
  { 
    id: 'family_social_hx', 
    label: 'Family/Social Hx', 
    icon: Users, 
    title: 'Socio-Familial Context', 
    subtitle: 'Environmental, lifestyle, and hereditary health influences.' 
  },
];

// --- Components ---

const InputField = ({ label, placeholder, type = "text", value, onChange, required }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all"
    />
  </div>
);

const SelectField = ({ label, options, value, onChange, required }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all"
      >
        <option value="">Select option...</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronLeft className="w-4 h-4 rotate-270" />
      </div>
    </div>
  </div>
);

const TextAreaField = ({ label, placeholder, value, onChange, required }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition-all resize-none"
    />
  </div>
);

const FileUpload = ({ label, subtitle }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    <div className="w-full border-2 border-dashed border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/30 hover:bg-slate-50/50 transition-colors cursor-pointer group">
      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#8B5E3C] transition-colors">
        <Upload className="w-6 h-6" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-tight">{subtitle}</p>
      </div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(currentStep.id));
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the session? All data will be lost.")) {
      setFormData({});
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'demographics':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Date of Admission" type="date" value={formData.admissionDate} onChange={(v: any) => updateField('admissionDate', v)} required />
            <InputField label="Patient Full Name" placeholder="John Doe" value={formData.fullName} onChange={(v: any) => updateField('fullName', v)} required />
            <InputField label="Age (years)" placeholder="45" value={formData.age} onChange={(v: any) => updateField('age', v)} required />
            <InputField label="Sex" placeholder="Male/Female" value={formData.sex} onChange={(v: any) => updateField('sex', v)} required />
            <InputField label="Tribe/Ethnicity" placeholder="Kikuyu" value={formData.ethnicity} onChange={(v: any) => updateField('ethnicity', v)} />
            <InputField label="Address/Location" placeholder="Nairobi" value={formData.address} onChange={(v: any) => updateField('address', v)} />
            <InputField label="Religion" placeholder="Christian" value={formData.religion} onChange={(v: any) => updateField('religion', v)} />
            <InputField label="Occupation" placeholder="Teacher" value={formData.occupation} onChange={(v: any) => updateField('occupation', v)} />
            <InputField label="Next of Kin (Initials)" placeholder="J.D" value={formData.nextOfKin} onChange={(v: any) => updateField('nextOfKin', v)} />
            <InputField label="Relationship" placeholder="Spouse" value={formData.relationship} onChange={(v: any) => updateField('relationship', v)} />
          </div>
        );
      case 'presenting_complaint':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Chief Complaint" placeholder="e.g., Neck swelling, Epigastric pain" value={formData.chiefComplaint} onChange={(v: any) => updateField('chiefComplaint', v)} required />
            <InputField label="Duration" placeholder="e.g., 1 year, 2 months" value={formData.duration} onChange={(v: any) => updateField('duration', v)} required />
          </div>
        );
      case 'hpc_details':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Onset" placeholder="sudden/gradual/insidious" value={formData.onset} onChange={(v: any) => updateField('onset', v)} />
            <InputField label="Progression" placeholder="progressive/static/improving" value={formData.progression} onChange={(v: any) => updateField('progression', v)} />
            <InputField label="Character" placeholder="sharp, dull, burning, aching" value={formData.character} onChange={(v: any) => updateField('character', v)} />
            <InputField label="Severity" placeholder="mild/moderate/severe or 1-10" value={formData.severity} onChange={(v: any) => updateField('severity', v)} />
            <InputField label="Location" placeholder="exact anatomical location" value={formData.location} onChange={(v: any) => updateField('location', v)} />
            <InputField label="Radiation" placeholder="where symptoms radiate" value={formData.radiation} onChange={(v: any) => updateField('radiation', v)} />
            <div className="md:col-span-2">
              <TextAreaField label="Associated Symptoms (Present)" placeholder="fever, weight loss, night sweats, cough, etc." value={formData.associatedSymptoms} onChange={(v: any) => updateField('associatedSymptoms', v)} />
            </div>
            <div className="md:col-span-2">
              <TextAreaField label="Important Negative Findings" placeholder="symptoms NOT present that help rule out differentials" value={formData.negativeFindings} onChange={(v: any) => updateField('negativeFindings', v)} />
            </div>
            <InputField label="Aggravating Factors" placeholder="lying flat, spicy foods, movement" value={formData.aggravating} onChange={(v: any) => updateField('aggravating', v)} />
            <InputField label="Relieving Factors" placeholder="rest, medication, position" value={formData.relieving} onChange={(v: any) => updateField('relieving', v)} />
            <InputField label="Previous Treatment" placeholder="medications tried" value={formData.prevTreatment} onChange={(v: any) => updateField('prevTreatment', v)} />
            <InputField label="Response to Treatment" placeholder="improvement/no change/worsening" value={formData.respTreatment} onChange={(v: any) => updateField('respTreatment', v)} />
            <div className="md:col-span-2">
              <TextAreaField label="Impact on Daily Activities" placeholder="how symptoms affect daily life" value={formData.impact} onChange={(v: any) => updateField('impact', v)} />
            </div>
          </div>
        );
      case 'review_of_systems':
        return (
          <div className="flex flex-col gap-8">
            {['GENERAL', 'CARDIOVASCULAR', 'RESPIRATORY', 'GASTROINTESTINAL'].map(system => (
              <div key={system} className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8B5E3C]" />
                  <span className="text-[10px] font-bold text-slate-700 tracking-widest">{system}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Symptoms Present" value={formData[`${system}_present`]} onChange={(v: any) => updateField(`${system}_present`, v)} />
                  <InputField label="Symptoms Denied" value={formData[`${system}_denied`]} onChange={(v: any) => updateField(`${system}_denied`, v)} />
                </div>
              </div>
            ))}
          </div>
        );
      case 'past_medical_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Chronic Medical Conditions" value={formData.chronicConditions} onChange={(v: any) => updateField('chronicConditions', v)} />
            <TextAreaField label="Current Pharmacotherapy" value={formData.medications} onChange={(v: any) => updateField('medications', v)} />
            <TextAreaField label="Allergies & Hypersensitivities" value={formData.allergies} onChange={(v: any) => updateField('allergies', v)} />
            <FileUpload label="Supporting Records" subtitle="UPLOAD LAB RESULTS OR CLINICAL NOTES" />
          </div>
        );
      case 'past_surgical_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Previous Surgeries" placeholder="Appendectomy 2015, etc." value={formData.surgeries} onChange={(v: any) => updateField('surgeries', v)} />
            <InputField label="Major Trauma/Fractures" placeholder="Describe any major injuries" value={formData.trauma} onChange={(v: any) => updateField('trauma', v)} />
            <InputField label="Blood Transfusion History" placeholder="Yes/No, if yes when and why" value={formData.transfusions} onChange={(v: any) => updateField('transfusions', v)} />
          </div>
        );
      case 'family_social_hx':
        return (
          <div className="flex flex-col gap-8">
            <TextAreaField label="Familial Health Patterns" value={formData.familyHistory} onChange={(v: any) => updateField('familyHistory', v)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField label="Alcohol Consumption" options={['None', 'Social', 'Heavy']} value={formData.alcohol} onChange={(v: any) => updateField('alcohol', v)} />
              <SelectField label="Tobacco Consumption" options={['None', 'Occasional', 'Regular']} value={formData.tobacco} onChange={(v: any) => updateField('tobacco', v)} />
              <InputField label="Current Marital Status" value={formData.maritalStatus} onChange={(v: any) => updateField('maritalStatus', v)} />
              <InputField label="Household Dependents" value={formData.dependents} onChange={(v: any) => updateField('dependents', v)} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-8 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#8B5E3C] animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Malae</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">
            Clinical<br />Intelligence
          </p>
        </div>

        <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
          {STEPS.map((step, index) => {
            const isActive = currentStepIndex === index;
            const isCompleted = completedSteps.has(step.id);
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(index)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative
                  ${isActive ? 'bg-[#8B5E3C] text-white shadow-lg shadow-[#8B5E3C]/20' : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                <div className={`
                  w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                  ${isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}
                `}>
                  {isCompleted && !isActive ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-sm font-semibold tracking-tight">{step.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Case Mastery</span>
            <span className="text-xs font-bold text-[#8B5E3C]">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-[#8B5E3C] rounded-full"
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 px-10 flex items-center justify-between sticky top-0 z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Module</span>
            <span className="text-sm font-bold text-slate-800">{currentStep.label}</span>
          </div>
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5E3C] text-white text-xs font-bold hover:bg-[#7D5233] transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET SESSION
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-10 py-12">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-10"
              >
                <div className="flex flex-col gap-2 text-center md:text-left">
                  <h2 className="text-4xl font-bold tracking-tight text-slate-800">{currentStep.title}</h2>
                  <p className="text-lg text-slate-400 font-medium">{currentStep.subtitle}</p>
                </div>

                <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100">
                  {renderStepContent()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation */}
        <footer className="h-24 bg-white border-t border-slate-100 px-10 flex items-center justify-between sticky bottom-0 z-10">
          <button 
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all
              ${currentStepIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50'}
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            PREVIOUS
          </button>

          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <RotateCcw className="w-4 h-4" />
            NEW CASE
          </button>

          {currentStepIndex === STEPS.length - 1 ? (
            <button 
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <FileText className="w-4 h-4" />
              COMPILE REPORT
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#8B5E3C] text-white text-sm font-bold hover:bg-[#7D5233] transition-all shadow-lg shadow-[#8B5E3C]/20 group"
            >
              PROCEED
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
