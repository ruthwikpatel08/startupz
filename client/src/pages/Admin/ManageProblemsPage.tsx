import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Problem } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getCategoryColor } from '../../components/problems/ProblemCard';
import {
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Flame,
  Globe2,
  FolderTree,
  ArrowLeft,
  Eye,
  CheckCircle,
} from 'lucide-react';

export const ManageProblemsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await api.getProblems({ limit: 100 });
      const list = Array.isArray(res) ? res : res?.problems || [];
      setProblems(list);
    } catch (err) {
      console.error('Failed to load admin problems list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await api.deleteProblem(id);
      setProblems((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete problem statement.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !categoryFilter ||
      p.categories.some((c) => c.toLowerCase() === categoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(problems.flatMap((p) => p.categories || []))
  ).sort();

  return (
    <div className="min-h-screen py-8 sm:py-12 space-y-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/admin"
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Admin Dashboard
              </Link>
              <span className="text-slate-400">/</span>
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                Problem Statements
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Shield className="text-brand-600" size={28} />
              <span>Manage Global Problem Statements</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Curate, edit, and publish authoritative global challenges from UN SDGs, WHO, and World Bank.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/problems"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Eye size={15} />
              <span>Public View</span>
            </Link>

            <Link
              to="/admin/problems/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 transition-all hover:scale-105"
            >
              <Plus size={16} />
              <span>Create New Problem</span>
            </Link>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Problems
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {problems.length}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
              <Flame size={13} />
              <span>Critical Impact (9-10)</span>
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {problems.filter((p) => (p.impactLevel || p.impact_level || 0) >= 9).length}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Domains Covered
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {categories.length}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Global Coverage
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              100%
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems by title, keywords..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Problems Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading Problem Statements...
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-500">
              No problem statements matched your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-6">Problem Statement</th>
                    <th className="py-3.5 px-4">Categories</th>
                    <th className="py-3.5 px-4">Regions</th>
                    <th className="py-3.5 px-4">Impact</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredProblems.map((p) => {
                    const impact = p.impactLevel || p.impact_level || 7;
                    const source = p.sourceUrl || p.source_url;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-4 px-6 max-w-sm">
                          <Link
                            to={`/problems/${p.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors block line-clamp-1"
                          >
                            {p.title}
                          </Link>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {p.description}
                          </p>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.categories?.slice(0, 2).map((c, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(
                                  c
                                )}`}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {p.regions?.join(', ') || 'Global'}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                              impact >= 9
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            <Flame size={12} />
                            <span>{impact}/10</span>
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {source ? (
                            <a
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>Citation</span>
                              <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              to={`/problems/${p.id}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="View Public Page"
                            >
                              <Eye size={15} />
                            </Link>

                            <Link
                              to={`/admin/problems/${p.id}/edit`}
                              className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                              title="Edit Problem"
                            >
                              <Edit size={15} />
                            </Link>

                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                              title="Delete Problem"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Delete Problem Statement?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This action cannot be undone. All associated join records and bookmarks for this problem will be removed.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
