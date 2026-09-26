import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Problem } from '../../types';
import { api } from '../../services/api';
import { ProblemForm } from '../../components/problems/ProblemForm';
import { Shield, ArrowLeft } from 'lucide-react';

export const ProblemFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isEdit = Boolean(id);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getProblem(id)
        .then((data) => {
          setProblem(data);
        })
        .catch((err) => {
          console.error('Failed to load problem statement for edit:', err);
          alert('Failed to load problem details.');
          navigate('/admin/problems');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, navigate]);

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await api.updateProblem(id, formData);
      } else {
        await api.createProblem(formData);
      }
      navigate('/admin/problems');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs font-bold text-slate-400 animate-pulse">
        Loading Problem Statement Details...
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 space-y-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link
            to="/admin/problems"
            className="inline-flex items-center gap-1.5 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Problem Management</span>
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 dark:text-white">
            {isEdit ? 'Edit Problem Statement' : 'New Problem Statement'}
          </span>
        </div>

        {/* Card Header */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {isEdit ? 'Edit Global Problem Statement' : 'Publish New Global Challenge'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Curate verified world challenges drawing on UN SDGs, WHO, and World Bank research.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <ProblemForm
              initialData={problem}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/admin/problems')}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
