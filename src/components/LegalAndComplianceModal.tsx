import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, FileText, AlertTriangle, X, Lock, CheckCircle2, Stethoscope, Scale } from 'lucide-react';

export type LegalTab = 'disclaimer' | 'privacy' | 'terms';

interface LegalAndComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: LegalTab;
}

export const LegalAndComplianceModal: React.FC<LegalAndComplianceModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'disclaimer'
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(defaultTab);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="legal-compliance-modal-backdrop" 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-surface rounded-2xl border border-line shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-line flex items-center justify-between bg-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-main">Legal & Clinical Compliance</h2>
                <p className="text-xs text-text-muted">Google Play Policy & Health Regulations Disclosure</p>
              </div>
            </div>
            <button
              id="close-legal-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-line px-5 bg-surface gap-2 pt-2">
            <button
              id="tab-medical-disclaimer-btn"
              onClick={() => setActiveTab('disclaimer')}
              className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'disclaimer'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Medical Disclaimer</span>
            </button>

            <button
              id="tab-privacy-policy-btn"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'privacy'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>

            <button
              id="tab-terms-of-service-btn"
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'terms'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-text-main">
            {activeTab === 'disclaimer' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-amber-900">Mandatory Medical & Clinical Disclaimer</h3>
                    <p className="mt-1 text-xs text-amber-800 leading-normal">
                      Malae Tech is a digital clinical documentation assistant and academic case organizer created solely for licensed healthcare practitioners, medical residents, and healthcare trainees.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-text-main flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    1. Not a Diagnostic Medical Device
                  </h4>
                  <p className="text-text-muted">
                    This software does not make independent clinical diagnoses, prescribe drug dosages, or direct emergency patient care. The AI case synthesis and structuring modules are intended to expedite medical documentation and formatting only. Attending physicians and healthcare providers bear absolute, sole responsibility for validating all medical findings, differential diagnoses, and management plans before applying them to patient care.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-text-main flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    2. Patient Confidentiality & Data De-identification
                  </h4>
                  <p className="text-text-muted">
                    Users must adhere to regional medical council ethical codes, HIPAA, and GDPR standards. Personal health identifiers (direct patient names, national identity numbers, exact addresses) should never be processed without appropriate institutional consent. Any de-identified case information entered into the application remains securely isolated.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-text-main flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    3. Academic & Institutional Verification
                  </h4>
                  <p className="text-text-muted">
                    Practitioner and medical student verification requests submitted via the platform are reviewed solely to maintain professional integrity across clinical collaborative networks.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 flex items-start gap-3">
                  <Lock className="w-5 h-5 shrink-0 text-blue-700 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-blue-900">Google Play Data Safety Disclosure</h3>
                    <p className="mt-1 text-xs text-blue-800 leading-normal">
                      Last Updated: September 2026. We prioritize practitioner privacy and rigorous medical confidentiality.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">1. Information We Collect</h4>
                  <ul className="list-disc pl-5 space-y-1 text-text-muted">
                    <li><strong className="text-text-main">Account Information:</strong> Name, professional email address, medical cadre, and hospital/medical school affiliation.</li>
                    <li><strong className="text-text-main">Verification Data:</strong> Medical student ID or practitioner registration reference, used solely for board verification.</li>
                    <li><strong className="text-text-main">Clinical Documentation:</strong> Clinical notes and case templates drafted by the practitioner.</li>
                    <li><strong className="text-text-main">Audio Dictation:</strong> Temporary audio captures processed for speech-to-text case history transcription, never stored permanently.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">2. How Information is Secured</h4>
                  <p className="text-text-muted">
                    All communications and cloud transmissions are encrypted using standard TLS 1.3/HTTPS. Database documents are protected by isolated Firestore access control rules ensuring only the document owner and authorized collaborators can access clinical records.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">3. Data Sharing & Third Parties</h4>
                  <p className="text-text-muted">
                    We never sell, monetize, or disclose user data to advertisers or third-party data brokers. Data is processed strictly to provide clinical documentation services.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">4. User Rights & Account Deletion</h4>
                  <p className="text-text-muted">
                    In compliance with Google Play Store User Data policies and GDPR, users may delete their account and permanently purge all associated data at any time directly through the in-app Profile screen, or by contacting our administration at <span className="font-mono font-medium text-primary">drsamanthaainembabazi@gmail.com</span>.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">1. Acceptance of Terms</h4>
                  <p className="text-text-muted">
                    By installing, signing up for, or using Malae Tech, you agree to abide by these Terms of Service. If you do not agree with any part of these terms, do not use the application.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">2. User Eligibility</h4>
                  <p className="text-text-muted">
                    This platform is provided exclusively for individuals who are 18 years of age or older and who are healthcare students, physicians, nurses, clinical officers, or allied health professionals.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">3. Clinical Responsibility</h4>
                  <p className="text-text-muted">
                    The user agrees that any patient management decisions, treatment regimens, diagnostic actions, or drug administrations are strictly made under the independent clinical judgment of licensed medical personnel. Malae Tech and its developers hold no liability for clinical outcomes.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-text-main">4. Termination</h4>
                  <p className="text-text-muted">
                    We reserve the right to suspend accounts that submit falsified verification documents, violate patient privacy laws, or misuse collaborative clinical features.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-line bg-bg/50 flex items-center justify-between">
            <span className="text-[11px] text-text-muted flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Google Play Compliant
            </span>
            <button
              id="confirm-legal-modal-btn"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-accent transition-all shadow-sm"
            >
              Understood & Acknowledged
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
