import { useMemo, useState } from 'react'
import { Eye, ImagePlus, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { MediaPreview } from '@/components/community/MediaPreview'
import { cn } from '@/lib/utils'
import type { PostStatus } from '@/lib/constants'
import type { PublicPost } from '@/types/community-public'
import type { PostInput } from '@/services/business.service'

/**
 * Business Create Post screen (spec §3.2): supported post types, content with
 * character limit, media with preview/removal, topics/hashtags, audience and
 * visibility, preview before publishing, Save Draft / Cancel / Publish, and
 * validation errors beside the relevant fields.
 */

const CONTENT_LIMIT = 1000

const TYPE_OPTIONS = [
  { id: 'business_info', label: 'Update' },
  { id: 'offer', label: 'Offer' },
  { id: 'announcement', label: 'Announcement' },
] as const

type ComposerType = (typeof TYPE_OPTIONS)[number]['id']

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Everyone', hint: 'Visible to the whole community, including visitors.' },
  { id: 'both', label: 'Signed-in members', hint: 'Only signed-in business and consumer accounts.' },
  { id: 'business', label: 'Businesses only', hint: 'Only business accounts in the community.' },
] as const

export interface BusinessPostComposerProps {
  isOpen: boolean
  onClose: () => void
  /** Post being edited; omit to create a new one. */
  editing?: PublicPost | null
  onSubmit: (input: PostInput) => void
  submitting?: boolean
}

interface FormState {
  type: ComposerType
  title: string
  content: string
  mediaUrls: string[]
  hashtags: string[]
  visibility: 'public' | 'business' | 'both'
}

const EMPTY_FORM: FormState = {
  type: 'business_info',
  title: '',
  content: '',
  mediaUrls: [],
  hashtags: [],
  visibility: 'public',
}

function fromPost(post: PublicPost): FormState {
  const type = TYPE_OPTIONS.find((t) => t.id === post.postType)?.id ?? 'business_info'
  return {
    type,
    title: post.title ?? '',
    content: post.content,
    mediaUrls: post.mediaUrls ?? [],
    hashtags: post.hashtags ?? [],
    visibility: (post.visibility === 'business' || post.visibility === 'both' ? post.visibility : 'public') as
      FormState['visibility'],
  }
}

function normaliseHashtag(raw: string): string {
  return raw.replace(/^#/, '').replace(/[^\p{L}\p{N}_]/gu, '')
}

/**
 * Edits keep the post's lifecycle unless a resubmission applies (spec §3.3):
 * rejected → pending (back in the review queue), pending stays pending, drafts
 * stay drafts (the list's "Publish now" is the explicit way to publish one),
 * live posts stay live. Archived posts send no status so they stay archived —
 * saving an edit never publishes content that is waiting for review.
 */
function statusOnEdit(current: PostStatus | undefined): PostInput['status'] {
  if (current === 'rejected' || current === 'pending') return 'pending'
  if (current === 'draft') return 'draft'
  if (current === 'archived') return undefined
  return 'published'
}

export function BusinessPostComposer({ isOpen, onClose, editing, onSubmit, submitting }: BusinessPostComposerProps) {
  const [form, setForm] = useState<FormState>(() => (editing ? fromPost(editing) : EMPTY_FORM))
  const [mediaInput, setMediaInput] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string; media?: string }>({})
  // Re-initialise when opened for a different post.
  const [editingId, setEditingId] = useState<string | null>(editing?.id ?? null)
  if ((editing?.id ?? null) !== editingId) {
    setEditingId(editing?.id ?? null)
    setForm(editing ? fromPost(editing) : EMPTY_FORM)
    setErrors({})
    setShowPreview(false)
  }

  const needsTitle = form.type !== 'business_info'
  const contentLength = form.content.length

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (needsTitle && !form.title.trim()) next.title = 'Add a title for this post type.'
    if (!form.content.trim()) next.content = 'Write something before saving.'
    else if (form.content.length > CONTENT_LIMIT) next.content = `Keep the text within ${CONTENT_LIMIT} characters.`
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const buildInput = (status: 'draft' | 'published'): PostInput => ({
    postType: form.type,
    title: needsTitle ? form.title.trim() : undefined,
    content: form.content.trim(),
    // Always send the arrays explicitly (empty clears them); on edits the
    // service keeps whatever is omitted, so status-only updates are loss-free.
    mediaUrls: form.mediaUrls,
    hashtags: form.hashtags,
    visibility: form.visibility,
    status: editing ? statusOnEdit(editing.status) : status,
  })

  const publish = () => {
    if (!validate()) return
    onSubmit(buildInput('published'))
  }

  const saveDraft = () => {
    // Drafts only need enough to come back to later — content or a title.
    if (!form.content.trim() && !form.title.trim()) {
      setErrors({ content: 'Add some text or a title before saving a draft.' })
      return
    }
    if (form.content.length > CONTENT_LIMIT) {
      setErrors({ content: `Keep the text within ${CONTENT_LIMIT} characters.` })
      return
    }
    setErrors({})
    onSubmit(buildInput('draft'))
  }

  const addMedia = () => {
    const url = mediaInput.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setErrors((e) => ({ ...e, media: 'Media must be a valid image or video URL (https://…).' }))
      return
    }
    setErrors((e) => ({ ...e, media: undefined }))
    setForm((f) => ({ ...f, mediaUrls: [...f.mediaUrls, url] }))
    setMediaInput('')
  }

  const addHashtag = () => {
    const tag = normaliseHashtag(hashtagInput)
    if (!tag) return
    setForm((f) => ({ ...f, hashtags: f.hashtags.includes(tag) ? f.hashtags : [...f.hashtags, tag] }))
    setHashtagInput('')
  }

  const previewPost: PublicPost = useMemo(
    () =>
      ({
        id: 'preview',
        authorId: 'preview',
        author: { id: 'preview', name: 'Your business', userType: 'business' },
        postType: form.type,
        status: 'published',
        visibility: form.visibility,
        title: needsTitle ? form.title.trim() || null : null,
        content: form.content.trim() || 'Your post text will appear here.',
        mediaUrls: form.mediaUrls.length ? form.mediaUrls : null,
        hashtags: form.hashtags.length ? form.hashtags : null,
        createdAt: new Date().toISOString(),
      }) as PublicPost,
    [form, needsTitle],
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit post' : 'New post'}>
      <div className='space-y-4'>
        {/* Post type */}
        <div>
          <p className='label'>Post type</p>
          <div className='flex gap-1.5 overflow-x-auto scrollbar-hide'>
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type='button'
                onClick={() => setForm((f) => ({ ...f, type: opt.id }))}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm',
                  form.type === opt.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        {needsTitle && (
          <div>
            <label htmlFor='bp-title' className='label'>
              Title
            </label>
            <input
              id='bp-title'
              className={cn('input-field', errors.title && 'border-red-400')}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={form.type === 'offer' ? 'e.g. Weekend Community Offer' : 'e.g. Workshop announcement'}
            />
            {errors.title && <p className='error-text'>{errors.title}</p>}
          </div>
        )}

        {/* Content */}
        <div>
          <label htmlFor='bp-content' className='label'>
            {form.type === 'offer' ? 'Describe your offer, terms and where to redeem' : 'What would you like to share?'}
          </label>
          <textarea
            id='bp-content'
            className={cn('textarea-field', errors.content && 'border-red-400')}
            rows={5}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder='Share an update with your community…'
          />
          <div className='flex items-center justify-between'>
            {errors.content ? <p className='error-text'>{errors.content}</p> : <span />}
            <span className={cn('text-xs', contentLength > CONTENT_LIMIT ? 'text-red-600' : 'text-gray-400')}>
              {contentLength}/{CONTENT_LIMIT}
            </span>
          </div>
        </div>

        {/* Media */}
        <div>
          <p className='label'>Media</p>
          {form.mediaUrls.length > 0 && (
            <div className='mb-2'>
              <MediaPreview urls={form.mediaUrls} />
            </div>
          )}
          <div className='flex gap-2'>
            <input
              className='input-field'
              value={mediaInput}
              onChange={(e) => setMediaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMedia()
                }
              }}
              placeholder='Paste an image or video URL…'
            />
            <Button type='button' variant='secondary' size='sm' icon={<ImagePlus className='h-4 w-4' />} onClick={addMedia}>
              Add
            </Button>
          </div>
          {errors.media && <p className='error-text'>{errors.media}</p>}
          {form.mediaUrls.length > 0 && (
            <div className='mt-1.5 flex flex-wrap gap-1.5'>
              {form.mediaUrls.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type='button'
                  onClick={() => setForm((f) => ({ ...f, mediaUrls: f.mediaUrls.filter((_, j) => j !== i) }))}
                  className='flex max-w-[220px] items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200'
                >
                  <X className='h-3 w-3 shrink-0' />
                  <span className='truncate'>{url.split('/').pop()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Topics / hashtags */}
        <div>
          <label htmlFor='bp-hashtags' className='label'>
            Topics & hashtags
          </label>
          <div className='flex gap-2'>
            <input
              id='bp-hashtags'
              className='input-field'
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addHashtag()
                }
              }}
              placeholder='Add a topic, e.g. SupportLocal'
            />
            <Button type='button' variant='secondary' size='sm' icon={<Tag className='h-4 w-4' />} onClick={addHashtag}>
              Add
            </Button>
          </div>
          {form.hashtags.length > 0 && (
            <div className='mt-1.5 flex flex-wrap gap-1.5'>
              {form.hashtags.map((tag) => (
                <button
                  key={tag}
                  type='button'
                  onClick={() => setForm((f) => ({ ...f, hashtags: f.hashtags.filter((h) => h !== tag) }))}
                  className='flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100'
                >
                  #{tag} <X className='h-3 w-3' />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Audience / visibility */}
        <div>
          <p className='label'>Audience & visibility</p>
          <div className='space-y-1.5'>
            {VISIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm',
                  form.visibility === opt.id ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                <input
                  type='radio'
                  name='bp-visibility'
                  className='mt-0.5'
                  checked={form.visibility === opt.id}
                  onChange={() => setForm((f) => ({ ...f, visibility: opt.id }))}
                />
                <span>
                  <span className='block font-medium text-gray-900'>{opt.label}</span>
                  <span className='block text-xs text-gray-500'>{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className='rounded-lg border border-gray-200 bg-gray-50 p-3'>
            <p className='mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400'>
              <Eye className='h-3.5 w-3.5' /> Preview
            </p>
            <div className='rounded-lg bg-white p-3 shadow-sm'>
              <div className='flex items-center gap-2'>
                <Avatar name='Your business' size='sm' />
                <div>
                  <p className='text-sm font-semibold text-gray-900'>Your business</p>
                  <p className='text-xs text-gray-500'>Just now · {VISIBILITY_OPTIONS.find((v) => v.id === form.visibility)?.label}</p>
                </div>
              </div>
              {previewPost.title && <p className='mt-2 text-sm font-semibold text-gray-900'>{previewPost.title}</p>}
              <p className='mt-1 whitespace-pre-wrap text-sm text-gray-800'>{previewPost.content}</p>
              {previewPost.mediaUrls && previewPost.mediaUrls.length > 0 && (
                <div className='mt-2'>
                  <MediaPreview urls={previewPost.mediaUrls} />
                </div>
              )}
              {form.hashtags.length > 0 && (
                <p className='mt-2 flex flex-wrap gap-1.5'>
                  {form.hashtags.map((tag) => (
                    <span key={tag} className='rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'>
                      #{tag}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        )}

        <div className='flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            icon={<Eye className='h-4 w-4' />}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </Button>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='secondary' size='sm' onClick={onClose}>
              Cancel
            </Button>
            {!editing && (
              <Button type='button' variant='secondary' size='sm' onClick={saveDraft} disabled={submitting}>
                Save draft
              </Button>
            )}
            <Button type='button' size='sm' onClick={publish} disabled={submitting}>
              {submitting
                ? 'Saving…'
                : editing?.status === 'rejected'
                  ? 'Resubmit for review'
                  : editing
                    ? 'Save changes'
                    : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
