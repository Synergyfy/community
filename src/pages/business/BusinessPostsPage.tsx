import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Heart,
  MessageCircle,
  Megaphone,
  Pencil,
  Plus,
  Send,
  Share2,
  Trash2,
} from 'lucide-react'
import { businessApi } from '@/services/business.service'
import { targetForPost } from '@/hooks/usePostActions'
import type { PublicPost } from '@/types/community-public'
import type { PostStatus } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { MediaPreview } from '@/components/community/MediaPreview'
import { ShareModal } from '@/components/sharing/ShareModal'
import { BusinessPostComposer } from '@/components/business/BusinessPostComposer'
import { cn } from '@/lib/utils'
import { formatDate } from './helpers'

/**
 * My Posts (spec §3.3): every state of the post lifecycle — published,
 * pending review, drafts, rejected (with moderation feedback) and archived —
 * with actions appropriate to each status. Ordinary posts are distinguishable
 * from campaign posts; campaign attribution only appears where a post is
 * actually linked to a campaign.
 */

const STATUS_TABS: { id: 'all' | PostStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'pending', label: 'Pending review' },
  { id: 'draft', label: 'Drafts' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'archived', label: 'Archived' },
]

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral' | 'primary'; label: string }> = {
  published: { variant: 'success', label: 'Published' },
  pending: { variant: 'warning', label: 'Pending review' },
  draft: { variant: 'neutral', label: 'Draft' },
  rejected: { variant: 'danger', label: 'Rejected' },
  archived: { variant: 'neutral', label: 'Archived' },
}

export function BusinessPostsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['business', 'dashboard'],
    queryFn: businessApi.getDashboard,
  })

  const [statusFilter, setStatusFilter] = useState<'all' | PostStatus>('all')
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<PublicPost | null>(null)
  const [shareTarget, setShareTarget] = useState<PublicPost | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['business', 'dashboard'] })

  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Parameters<typeof businessApi.updatePost>[1] }) =>
      id ? businessApi.updatePost(id, input) : businessApi.createPost(input),
    onSuccess: () => {
      setComposerOpen(false)
      setEditing(null)
      void invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessApi.deletePost(id),
    onSuccess: () => {
      setDeletingId(null)
      void invalidate()
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, restore }: { id: string; restore?: boolean }) =>
      restore ? businessApi.restorePost(id) : businessApi.archivePost(id),
    onSuccess: () => void invalidate(),
  })

  const posts = useMemo(
    () =>
      (data?.posts ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data],
  )

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: posts.length }
    for (const p of posts) map[p.status] = (map[p.status] ?? 0) + 1
    return map
  }, [posts])

  const visible = statusFilter === 'all' ? posts : posts.filter((p) => p.status === statusFilter)
  const saving = saveMutation.isPending

  const openCreate = () => {
    setEditing(null)
    setComposerOpen(true)
  }

  const openEdit = (post: PublicPost) => {
    setEditing(post)
    setComposerOpen(true)
  }

  const closeComposer = () => {
    setComposerOpen(false)
    setEditing(null)
  }

  const remove = (post: PublicPost) => {
    if (window.confirm(`Delete this ${post.status} post? This cannot be undone.`)) {
      setDeletingId(post.id)
      deleteMutation.mutate(post.id)
    }
  }

  const isCampaignPost = (post: PublicPost) => !!post.campaignId || post.postType === 'campaign'
  // Sharing follows the post's linked record (campaign post → campaign), the
  // same target every other surface uses — never a campaign id labelled 'post'.
  const shareT = shareTarget ? targetForPost(shareTarget) : null

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>My Posts</h2>
          <p className='text-sm text-gray-600'>Updates you share with the community, in every state.</p>
        </div>
        <Button size='sm' icon={<Plus className='h-4 w-4' />} onClick={openCreate}>
          New post
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className='flex gap-1.5 overflow-x-auto scrollbar-hide'>
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.id] ?? 0
          if (tab.id !== 'all' && count === 0 && statusFilter !== tab.id) return null
          const active = statusFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm',
                active
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {tab.label}
              <span className='rounded-full bg-gray-100 px-1.5 text-xs text-gray-600'>{count}</span>
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : visible.length === 0 ? (
        <div className='card'>
          <EmptyState
            icon={<Megaphone className='h-10 w-10' />}
            title={statusFilter === 'all' ? 'No posts yet' : `No ${STATUS_BADGE[statusFilter]?.label.toLowerCase() ?? statusFilter} posts`}
            description={
              statusFilter === 'all'
                ? 'Share news, events and updates with your followers.'
                : 'Posts in this state will appear here.'
            }
            action={statusFilter === 'all' ? <Button onClick={openCreate}>Create your first post</Button> : undefined}
          />
        </div>
      ) : (
        <div className='space-y-3'>
          {visible.map((post) => {
            const status = post.status || 'published'
            const badge = STATUS_BADGE[status] ?? STATUS_BADGE.published!
            return (
              <div key={post.id} className='card'>
                <div className='card-content space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {isCampaignPost(post) && <Badge variant='primary'>Campaign</Badge>}
                    <span className='text-xs text-gray-500'>{formatDate(post.createdAt)}</span>
                  </div>

                  {post.title && <h3 className='text-sm font-semibold text-gray-900'>{post.title}</h3>}
                  <p className='whitespace-pre-wrap text-sm text-gray-800'>{post.content}</p>
                  {post.mediaUrls && post.mediaUrls.length > 0 && <MediaPreview urls={post.mediaUrls} />}

                  {/* Moderation feedback (spec §3.3) */}
                  {status === 'pending' && (
                    <div className='flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800'>
                      <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                      This post is awaiting review. It has not been published yet — you can still edit it while it waits.
                    </div>
                  )}
                  {status === 'rejected' && (
                    <div className='flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700'>
                      <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                      <span>
                        <span className='font-semibold'>Rejected by moderators{post.moderatedAt ? ` on ${formatDate(post.moderatedAt)}` : ''}.</span>
                        {post.moderationReason && <span className='mt-0.5 block'>{post.moderationReason}</span>}
                        <span className='mt-0.5 block'>Edit the post and choose “Resubmit for review” to send it back to the moderators.</span>
                      </span>
                    </div>
                  )}

                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex items-center gap-4 text-xs text-gray-500'>
                      <span className='flex items-center gap-1'>
                        <Heart className='h-3.5 w-3.5' /> {post.likeCount ?? 0}
                      </span>
                      <span className='flex items-center gap-1'>
                        <MessageCircle className='h-3.5 w-3.5' /> {post.commentCount ?? 0}
                      </span>
                      <span className='flex items-center gap-1'>
                        <Share2 className='h-3.5 w-3.5' /> {post.shareCount ?? 0}
                      </span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <button onClick={() => openEdit(post)} className='btn-icon text-gray-500 hover:text-gray-900' aria-label='Edit post'>
                        <Pencil className='h-4 w-4' />
                      </button>
                      {status === 'draft' && (
                        <button
                          onClick={() => saveMutation.mutate({ id: post.id, input: { content: post.content, status: 'published' } })}
                          disabled={saving}
                          className='btn-icon text-gray-500 hover:text-primary-600'
                          aria-label='Publish draft now'
                          title='Publish now'
                        >
                          <Send className='h-4 w-4' />
                        </button>
                      )}
                      {status === 'published' && (
                        <>
                          <button
                            onClick={() => setShareTarget(post)}
                            className='btn-icon text-gray-500 hover:text-primary-600'
                            aria-label='Share post'
                          >
                            <Share2 className='h-4 w-4' />
                          </button>
                          <button
                            onClick={() => archiveMutation.mutate({ id: post.id })}
                            disabled={archiveMutation.isPending}
                            className='btn-icon text-gray-500 hover:text-amber-600'
                            aria-label='Archive post'
                            title='Archive'
                          >
                            <Archive className='h-4 w-4' />
                          </button>
                        </>
                      )}
                      {status === 'archived' && (
                        <button
                          onClick={() => archiveMutation.mutate({ id: post.id, restore: true })}
                          disabled={archiveMutation.isPending}
                          className='btn-icon text-gray-500 hover:text-green-600'
                          aria-label='Restore post'
                          title='Restore to published'
                        >
                          <ArchiveRestore className='h-4 w-4' />
                        </button>
                      )}
                      <button
                        onClick={() => remove(post)}
                        className='btn-icon text-gray-500 hover:text-red-600'
                        aria-label='Delete post'
                        disabled={deleteMutation.isPending && deletingId === post.id}
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BusinessPostComposer
        isOpen={composerOpen}
        onClose={closeComposer}
        editing={editing}
        submitting={saving}
        onSubmit={(input) => saveMutation.mutate({ id: editing?.id, input })}
      />

      {shareT && (
        <ShareModal
          isOpen
          onClose={() => setShareTarget(null)}
          targetType={shareT.type}
          targetId={shareT.id}
          title={shareTarget?.title ?? 'your post'}
        />
      )}
    </div>
  )
}
