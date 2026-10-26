import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Megaphone, MessageSquarePlus, Repeat, Tag } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import { OPEN_COMPOSER_EVENT, PostType, type ContentVisibility } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useCommunityLocation } from '@/hooks/useCommunityLocation'
import type { LocationContext, PublicPost, PublicUser } from '@/types/community-public'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

const TYPE_OPTIONS = [
  { id: PostType.STANDARD, label: 'General', icon: MessageSquarePlus },
  { id: PostType.OFFER, label: 'Offer', icon: Tag },
  { id: PostType.CAMPAIGN, label: 'Campaign', icon: Megaphone },
  { id: PostType.GROUP, label: 'Group', icon: Repeat },
] as const

/** Same audience control as the business composer (spec §2.4/§3.2 parity).
 *  Per-content-type visibility rules stay open pending §9-3 — this ships the
 *  control and records exactly what the author chose. */
const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Everyone', hint: 'Visible to the whole community, including visitors.' },
  { id: 'both', label: 'Signed-in members', hint: 'Only signed-in business and consumer accounts.' },
  { id: 'business', label: 'Businesses only', hint: 'Only business accounts in the community.' },
] as const

interface PostComposerProps {
  onCreated?: (post: PublicPost) => void
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\p{L}\p{N}_]+)/gu)
  if (!matches) return []
  return Array.from(new Set(matches.map((m) => m.replace(/^#/, ''))))
}

export function PostComposer({ onCreated }: PostComposerProps) {
  const { user } = useAuthStore()
  const { isAuthenticated, requireAuth } = useAuthGate()
  const location = useCommunityLocation()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PublicPost['postType']>(PostType.STANDARD)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showImage, setShowImage] = useState(false)
  const [visibility, setVisibility] = useState<ContentVisibility>('public')

  const needsTitle = type !== PostType.STANDARD

  const mutation = useMutation({
    mutationFn: () =>
      communityApi.createPost({
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        mediaUrls: imageUrl.trim() ? [imageUrl.trim()] : undefined,
        hashtags: extractHashtags(content),
        location: location as LocationContext | null,
        visibility,
        author: user as PublicUser,
      }),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: ['community', 'feed'] })
      reset()
      setOpen(false)
      onCreated?.(post)
    },
  })

  const reset = () => {
    setType(PostType.STANDARD)
    setTitle('')
    setContent('')
    setImageUrl('')
    setShowImage(false)
    setVisibility('public')
  }

  const canSubmit = content.trim().length > 0 && (!needsTitle || title.trim().length > 0) && !mutation.isPending

  const start = () => requireAuth(() => setOpen(true))

  useEffect(() => {
    const handler = () => start()
    window.addEventListener(OPEN_COMPOSER_EVENT, handler)
    return () => window.removeEventListener(OPEN_COMPOSER_EVENT, handler)
  }, [])

  return (
    <>
      <button
        onClick={start}
        className='card flex w-full items-center gap-3 p-3 text-left transition hover:shadow-md'
      >
        <Avatar src={user?.avatarUrl} name={user?.name || 'You'} size='md' />
        <span className='flex-1 text-sm text-gray-500'>
          {isAuthenticated
            ? `Share something with ${location?.cityName || 'your Community'}…`
            : 'Log in to post in your Community'}
        </span>
        <span className='btn-primary btn-sm pointer-events-none'>
          <MessageSquarePlus className='h-4 w-4' /> Post
        </span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title='Create a post'>
        <div className='space-y-4'>
          <div className='flex gap-1.5 overflow-x-auto scrollbar-hide'>
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const active = type === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id)}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm',
                    active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <Icon className='h-4 w-4' /> {opt.label}
                </button>
              )
            })}
          </div>

          <div className='flex items-start gap-2'>
            <Avatar src={user?.avatarUrl} name={user?.name || 'You'} size='md' />
            <div className='flex-1'>
              <div className='flex items-center gap-1 text-sm font-semibold text-gray-900'>
                {user?.name}
                <span className='text-xs font-normal text-gray-500'>· {location?.cityName || 'Your Community'}</span>
              </div>
            </div>
          </div>

          {needsTitle && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === PostType.OFFER ? 'Offer title' : type === PostType.CAMPAIGN ? 'Campaign title' : 'Group post title'}
              className='input-field'
            />
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            autoFocus
            placeholder={
              type === PostType.OFFER
                ? 'Describe your offer, terms and where to redeem…'
                : type === PostType.CAMPAIGN
                  ? 'Tell your Community about this campaign…'
                  : type === PostType.GROUP
                    ? 'Share what your group is doing…'
                    : 'What would you like to share?'
            }
            className='textarea-field w-full'
          />

          {showImage && (
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder='Paste an image URL'
              className='input-field'
            />
          )}

          {/* Audience (spec §2.4 parity with the business composer) */}
          <fieldset>
            <legend className='mb-1.5 text-xs font-semibold text-gray-700'>Who can see this post</legend>
            <div className='space-y-1'>
              {VISIBILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2',
                    visibility === opt.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <input
                    type='radio'
                    name='community-post-visibility'
                    className='mt-0.5'
                    checked={visibility === opt.id}
                    onChange={() => setVisibility(opt.id as ContentVisibility)}
                  />
                  <span className='min-w-0'>
                    <span className='block text-sm font-medium text-gray-900'>{opt.label}</span>
                    <span className='block text-xs text-gray-500'>{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className='flex items-center justify-between'>
            <button
              type='button'
              onClick={() => setShowImage((v) => !v)}
              className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600'
            >
              <ImagePlus className='h-4 w-4' /> {showImage ? 'Remove image' : 'Add image'}
            </button>
            <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Posting…' : 'Post to Community'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
