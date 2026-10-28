import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';
import {
  Boxes,
  HelpCircle,
  CheckCircle2,
  Globe,
  Upload,
  Video,
  Image as ImageIcon,
  X,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';

interface CreatePrototypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPost: Post) => void;
}

export const CreatePrototypeModal: React.FC<CreatePrototypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('Please select a valid image (.png, .jpg, .webp) or video (.mp4, .webm, .mov) file.');
      return;
    }

    // Storage consumption limits
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      setError('Image file is too large (maximum 5MB to preserve data storage). Please choose a smaller photo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      setError('Video file is too large (maximum 30MB to preserve data storage). Please compress or trim your video.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Video duration validation: MUST be less than 60 seconds (< 60s)
    if (isVideo) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      const objUrl = URL.createObjectURL(file);

      videoEl.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoEl.src);
        const durationSec = Math.round(videoEl.duration);

        if (videoEl.duration >= 60) {
          setError(`Video duration must be less than 60 seconds. The selected video is ${durationSec} seconds long. Please trim it to under 60 seconds.`);
          setMediaFile(null);
          setMediaPreview(null);
          setMediaType(null);
          setVideoDuration(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setVideoDuration(durationSec);
        setMediaType('video');
        setMediaFile(file);
        setMediaPreview(objUrl);
      };

      videoEl.onerror = () => {
        setError('Could not read video metadata. Please select a valid MP4 or WebM video file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      videoEl.src = objUrl;
    } else {
      // Photo preview
      setMediaType('image');
      setVideoDuration(null);
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setVideoDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) {
      setError('Please provide a title for your prototype.');
      return;
    }
    if (!problem.trim()) {
      setError('Please answer "What is the problem?" (Question statement).');
      return;
    }
    if (!solution.trim()) {
      setError('Please answer "What is the solution for that?".');
      return;
    }

    // Rule: Website URL or Photo/Video is required (at least one)
    const hasWebsite = Boolean(websiteUrl.trim());
    const hasMedia = Boolean(mediaFile);

    if (!hasWebsite && !hasMedia) {
      setError('Please provide either a Live Website URL OR upload a Video/Photo to showcase your prototype. (At least one is required).');
      return;
    }

    // Format website URL if provided
    let cleanWebsite = websiteUrl.trim();
    if (cleanWebsite && !cleanWebsite.startsWith('http://') && !cleanWebsite.startsWith('https://')) {
      cleanWebsite = `https://${cleanWebsite}`;
    }

    setSubmitting(true);
    setError(null);

    try {
      let uploadedMediaUrl: string | null = null;

      // 1. Upload media if present
      if (mediaFile) {
        try {
          const uploadRes = await api.uploadFile(mediaFile);
          if (uploadRes?.url) {
            uploadedMediaUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('API upload failed, attempting direct Supabase storage upload:', uploadErr);
          // Supabase Storage fallback
          try {
            const ext = mediaFile.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
            const fileName = `proto_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { data: supaUpload, error: supaErr } = await supabase.storage
              .from('post-images')
              .upload(fileName, mediaFile);

            if (!supaErr && supaUpload?.path) {
              const { data: publicUrl } = supabase.storage
                .from('post-images')
                .getPublicUrl(supaUpload.path);
              uploadedMediaUrl = publicUrl.publicUrl;
            }
          } catch (sbStorageErr) {
            console.warn('Supabase storage notice:', sbStorageErr);
          }
        }
      }

      // 2. Structured JSON content for maximum reliability & rich presentation
      const structuredContent = JSON.stringify({
        isPrototype: true,
        problem: problem.trim(),
        solution: solution.trim(),
        description: description.trim() || undefined,
        websiteUrl: cleanWebsite || undefined,
        mediaUrl: uploadedMediaUrl || undefined,
        mediaType: mediaType || undefined,
      });

      const payload = {
        postType: 'PROTOTYPE',
        title: title.trim(),
        content: structuredContent,
        problem: problem.trim(),
        solution: solution.trim(),
        websiteUrl: cleanWebsite || undefined,
        mediaUrl: uploadedMediaUrl || undefined,
        mediaType: mediaType || undefined,
        links: cleanWebsite || undefined,
        images: uploadedMediaUrl || undefined,
      };

      // 3. Create post via Express API
      let newPost: any = null;
      try {
        const res = await api.createPost(payload);
        newPost = res?.post || res;
      } catch (apiErr) {
        console.warn('Backend createPost failed, falling back to direct Supabase insert:', apiErr);
      }

      // 4. Fallback direct insert to Supabase posts table
      if (!newPost || !newPost.id) {
        const { data, error: supaInsertErr } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            post_type: 'PROTOTYPE',
            title: title.trim(),
            content: structuredContent,
            problem: problem.trim(),
            solution: solution.trim(),
            website_url: cleanWebsite || null,
            media_url: uploadedMediaUrl || null,
            media_type: mediaType || null,
            links: cleanWebsite || null,
            images: uploadedMediaUrl || null,
            likes_count: 0,
            comments_count: 0,
          })
          .select()
          .single();

        if (supaInsertErr) throw supaInsertErr;

        newPost = {
          id: data.id,
          authorId: user.id,
          postType: 'PROTOTYPE',
          title: data.title,
          content: data.content,
          problem: problem.trim(),
          solution: solution.trim(),
          websiteUrl: cleanWebsite || null,
          mediaUrl: uploadedMediaUrl || null,
          mediaType: mediaType || null,
          links: cleanWebsite || null,
          images: uploadedMediaUrl || null,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          isSaved: false,
          createdAt: data.created_at || new Date().toISOString(),
          author: {
            id: user.id,
            email: user.email,
            role: user.role || 'STUDENT',
            isVerified: user.isVerified,
            verificationBadge: user.verificationBadge,
            profile: user.profile,
          },
        };
      } else {
        // Ensure properties exist on response object
        newPost.problem = problem.trim();
        newPost.solution = solution.trim();
        newPost.websiteUrl = cleanWebsite || null;
        newPost.mediaUrl = uploadedMediaUrl || null;
        newPost.mediaType = mediaType || null;
        newPost.authorId = user.id;
        newPost.author_id = user.id;
        if (!newPost.author) {
          newPost.author = {
            id: user.id,
            email: user.email,
            role: user.role || 'STUDENT',
            isVerified: user.isVerified,
            verificationBadge: user.verificationBadge,
            profile: user.profile,
          };
        } else {
          newPost.author.id = user.id;
          if (!newPost.author.email) newPost.author.email = user.email;
          if (!newPost.author.profile) newPost.author.profile = user.profile;
        }
      }

      // 5. Permanent local cache save
      try {
        const raw = localStorage.getItem('startupz_user_persisted_posts');
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem(
          'startupz_user_persisted_posts',
          JSON.stringify([newPost, ...list.filter((p: any) => p.id !== newPost.id)])
        );
      } catch {}

      onSuccess(newPost);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish prototype. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share a Working Prototype / Sample"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner note */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-brand-50/80 to-blue-50/80 dark:from-brand-950/40 dark:to-dark-850 border border-brand-200/80 dark:border-brand-900/60 text-xs flex items-start gap-2.5">
          <Sparkles size={16} className="text-[var(--brand-primary)]  shrink-0 mt-0.5" />
          <p className="text-[var(--text-secondary)]  leading-relaxed">
            Showcase what you built — not completely, just an early working sample, website, or prototype. Others can test your demo and click <strong>"Build Together"</strong> to collaborate!
          </p>
        </div>

        {/* 1. Prototype Title */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)]  mb-1">
            Prototype Title / Project Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NextGen Telehealth MVP, AgriBot Edge Detection, DevPulse Analytics"
            className="input-base w-full text-xs font-semibold"
          />
        </div>

        {/* 2. The Question / Problem */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)]  mb-1 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-amber-500" />
            <span>What is the Problem? (The Question)</span>
            <span className="text-rose-500">*</span>
          </label>
          <p className="text-[11px] text-[var(--text-muted)]  mb-1.5">
            Clearly explain what problem or unmet challenge this prototype is created to solve.
          </p>
          <textarea
            required
            rows={3}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g. Remote clinic doctors spend 4+ hours daily transcribing handwritten notes, causing medical diagnosis delays and record loss..."
            className="input-base w-full text-xs resize-none"
          />
        </div>

        {/* 3. The Solution */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)]  mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>What is the Solution for that?</span>
            <span className="text-rose-500">*</span>
          </label>
          <p className="text-[11px] text-[var(--text-muted)]  mb-1.5">
            Explain how your prototype provides the solution to the problem above.
          </p>
          <textarea
            required
            rows={3}
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="e.g. An edge-deployed speech recognition tool that converts doctor voice notes into structured EMR records in real-time with 96% accuracy..."
            className="input-base w-full text-xs resize-none"
          />
        </div>

        {/* 4. What was built / Sample Overview */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)]  mb-1 flex items-center gap-1.5">
            <Boxes size={14} className="text-[var(--brand-primary)] " />
            <span>What Did You Build? (Sample Overview)</span>
          </label>
          <p className="text-[11px] text-[var(--text-muted)]  mb-1.5">
            Describe what you built so far (not finished, just a sample / working demonstration).
          </p>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Built a prototype web app using Next.js, Web Audio API, and FastAPI. Includes sample audio test records..."
            className="input-base w-full text-xs resize-none"
          />
        </div>

        {/* 5. Live Website URL & Media Upload (One or both required) */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)]  border border-[var(--border-subtle)]  space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] ">
              Website URL or Demo Video / Photo
            </span>
            <span className="text-[10px] font-semibold text-[var(--brand-primary)]  bg-[var(--brand-soft)]  px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-800">
              At least 1 required
            </span>
          </div>

          <p className="text-[11px] text-[var(--text-muted)]  leading-relaxed">
            If you provide a Website URL, media uploading is optional. If you upload a video or photo, the website URL is optional.
          </p>

          {/* Website URL Input */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)]  mb-1 flex items-center gap-1">
              <Globe size={13} className="text-blue-500" />
              <span>Live Website / Prototype URL</span>
              {mediaFile ? (
                <span className="text-[var(--text-muted)] font-normal text-[10px]">(Optional since media is uploaded)</span>
              ) : (
                <span className="text-[var(--text-muted)] text-[10px] font-normal">(Required if no media uploaded)</span>
              )}
            </label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://myprototype.vercel.app"
              className="input-base w-full text-xs"
            />
          </div>

          {/* Media Upload Area */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)]  mb-1 flex items-center gap-1">
              <Video size={13} className="text-[var(--brand-primary)]" />
              <span>Demo Video (Less than 60s) or Photo</span>
              {websiteUrl.trim() ? (
                <span className="text-[var(--text-muted)] font-normal text-[10px]">(Optional since website URL is provided)</span>
              ) : (
                <span className="text-[var(--text-muted)] text-[10px] font-normal">(Required if no website URL provided)</span>
              )}
            </label>

            {mediaPreview ? (
              <div className="relative p-2 rounded-xl bg-[var(--bg-surface)]  border border-[var(--border-subtle)]  space-y-2">
                <div className="flex items-center justify-between pb-1 text-xs">
                  <div className="flex items-center gap-2">
                    {mediaType === 'video' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] ">
                        <Video size={13} /> Video ({videoDuration}s / &lt;60s max)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <ImageIcon size={13} /> Photo ({((mediaFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <X size={13} /> Remove
                  </button>
                </div>

                {mediaType === 'video' ? (
                  <div className="max-h-56 overflow-hidden rounded-lg bg-black flex items-center justify-center">
                    <video
                      src={mediaPreview}
                      controls
                      playsInline
                      className="max-h-56 w-auto mx-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="max-h-56 overflow-hidden rounded-lg bg-[var(--bg-soft)]  flex items-center justify-center">
                    <img
                      src={mediaPreview}
                      alt="Prototype preview"
                      className="max-h-56 w-auto object-contain rounded-lg"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border-subtle)]  hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-[var(--bg-surface)] "
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-[var(--brand-soft)]  text-[var(--brand-primary)]  flex items-center justify-center">
                    <Upload size={16} />
                  </div>
                  <div className="text-xs font-bold text-[var(--text-primary)] ">
                    Click to upload Demo Video or Photo
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]  max-w-xs">
                    Video limit: <strong>Less than 60s</strong> (&lt;30MB). Image limit: <strong>Max 5MB</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)] ">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            <Boxes size={14} />
            <span>{submitting ? 'Publishing Prototype...' : 'Publish Prototype'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
