import { useState, useEffect } from "react";
import { get } from "../../services/api";
import { X, Calendar, User, UploadCloud, AlertTriangle } from "lucide-react";
import Card from "./Card";
import Button from "./Button";
import Badge from "./Badge";

export default function ViewFeedbackModal({ workOrder, onClose }) {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      const res = await get(`/api/tasks/${workOrder._id}/feedback`);
      if (res.success) {
        setFeedback(res.feedback);
      } else {
        setError(res.message || "Failed to load feedback");
      }
      setLoading(false);
    };

    fetchFeedback();
  }, [workOrder._id]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
      <Card 
        title="Submitted Feedback"
        subtitle="Review the recorded operational resolution details"
        className="w-full max-w-xl"
        noPadding
      >
        <div className="absolute top-6 right-8">
          <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0">
            <X size={16} />
          </Button>
        </div>

        <div className="p-8 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Retrieving feedback data...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center">
              <AlertTriangle size={18} className="mr-2" />
              {error}
            </div>
          ) : feedback ? (
            <>
              {/* Scores */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Operational Baseline</label>
                  <div className="text-3xl font-black text-slate-800 bg-slate-100 p-4 rounded-lg inline-block min-w-[80px] text-center border border-slate-200">
                    {feedback.before?.conditionScore || "-"}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Resolution Outcome</label>
                  <div className="text-3xl font-black text-blue-700 bg-blue-50 p-4 rounded-lg inline-block min-w-[80px] text-center border border-blue-200">
                    {feedback.after?.conditionScore || "-"}
                  </div>
                </div>
              </div>

              {/* Photo */}
              <div className="space-y-3">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Resolution Proof</label>
                <div className="h-40 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shadow-inner">
                  {feedback.photoUrl ? (
                    <a href={feedback.photoUrl} target="_blank" rel="noopener noreferrer">
                      <img src={feedback.photoUrl} alt="Proof" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                    </a>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <UploadCloud size={28} className="mb-2" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">No Photo Provided</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest block">Operational Summary</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded p-4 text-slate-800 text-sm font-medium min-h-[80px]">
                  {feedback.before?.issues?.notes || "No summary provided."}
                </div>
              </div>

              {/* Timings */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Completion Time</label>
                  <span className="text-sm font-bold text-slate-800">{feedback.completionTimeDays} days</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Delay / SLA</label>
                  {feedback.slaBreached ? (
                    <Badge variant="danger">Breached ({feedback.contractorDelayDays}d delay)</Badge>
                  ) : (
                    <Badge variant="success">On Time</Badge>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" onClick={onClose} className="w-full">Close Feedback</Button>
              </div>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
