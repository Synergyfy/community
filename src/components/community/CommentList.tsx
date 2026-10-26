import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import { communityApi } from '@/services/community.service'
import { useAuthStore } from '@/stores/auth.store'
import { useAuthGate } from '@/hooks/useAuthGate'
import { useEngagementStore } from '@/stores/engagement.store'
import type { PublicComment } from '@/types/community-public'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CommentItem } from './CommentItem'
import { CommentComposer } from './CommentComposer'
import { ReportModal } from '@/components/community/ReportModal'
import { cn } from '@/lib/utils'

interface CommentListProps {
  postId: string
  className?: string
}

export function CommentList({ postId, className }: CommentListProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { requireAuth } = useAuthGate()
  const likedCommentIds = useEngagementStore((s) => s.likedCommentIds)
  const toggleLikeComment = useEngagementStore((s) => s.toggleLikeComment)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<PublicComment | null>(null)

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['community', 'comments', postId],
    queryFn: () => communityApi.getComments(postId),
  })

  const addMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      communityApi.addComment(postId, content, parentId),
    onSuccess: (comment) => {
      queryClient.setQueryData<PublicComment[]>(['community', 'comments', postId], (prev = []) => [...prev, comment])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => communityApi.deleteComment(commentId),
    onSuccess: (_res, commentId) => {
      queryClient.setQueryData<PublicComment[]>(['community', 'comments', postId], (prev = []) =>
        prev.filter((c) => c.id !== commentId && c.parentId !== commentId),
      )
    },
  })

  const { roots, repliesByRoot } = useMemo(() => {
    const rootList = comments.filter((c) => !c.parentId)
    const map = new Map<string, PublicComment[]>()
    for (const c of comments) {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? []
        arr.push(c)
        map.set(c.parentId, arr)
      }
    }
    return { roots: rootList, repliesByRoot: map }
  }, [comments])

  const toggleLike = (comment: PublicComment) =>
    requireAuth(() => {
      void communityApi.likeComment(comment.id)
      toggleLikeComment(comment.id)
    })

  return (
    <section className={cn('space-y-4', className)}>
      <h2 className='text-sm font-semibold text-gray-900'>
        Comments {comments.length > 0 && <span className='text-gray-400'>({comments.length})</span>}
      </h2>

      <CommentComposer onSubmit={(content) => addMutation.mutateAsync({ content })} />

      {addMutation.isError && <p className='text-xs text-red-600'>We could not post your comment. Please try again.</p>}

      {isLoading ? (
        <div className='space-y-4 pt-2'>
          {[0, 1].map((i) => (
            <div key={i} className='flex items-start gap-2.5'>
              <Skeleton className='h-8 w-8 rounded-full' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-14 w-full rounded-2xl' />
                <Skeleton className='h-3 w-20' />
              </div>
            </div>
          ))}
        </div>
      ) : roots.length === 0 ? (
        <EmptyState icon={<MessageSquare className='h-8 w-8' />} title='No comments yet' description='Start the conversation.' />
      ) : (
        <div className='space-y-4'>
          {roots.map((comment) => {
            const replies = repliesByRoot.get(comment.id) ?? []
            return (
              <div key={comment.id} className='space-y-3'>
                <CommentItem
                  comment={comment}
                  liked={likedCommentIds.includes(comment.id)}
                  canDelete={!!user && (user.id === comment.authorId || user.userType === 'admin')}
                  onLike={toggleLike}
                  onDelete={(c) => deleteMutation.mutate(c.id)}
                  onReply={() => setReplyTo((r) => (r === comment.id ? null : comment.id))}
                  onReport={user?.id !== comment.authorId ? setReportTarget : undefined}
                />

                {replies.length > 0 && (
                  <div className='ml-10 space-y-3 border-l border-gray-100 pl-3'>
                    {replies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        liked={likedCommentIds.includes(reply.id)}
                        canDelete={!!user && (user.id === reply.authorId || user.userType === 'admin')}
                        onLike={toggleLike}
                        onDelete={(c) => deleteMutation.mutate(c.id)}
                        onReply={() => setReplyTo((r) => (r === comment.id ? null : comment.id))}
                        onReport={user?.id !== reply.authorId ? setReportTarget : undefined}
                      />
                    ))}
                  </div>
                )}

                {replyTo === comment.id && (
                  <div className='ml-10'>
                    <CommentComposer
                      autoFocus
                      placeholder={`Reply to ${comment.author.name}...`}
                      onSubmit={async (content) => {
                        await addMutation.mutateAsync({ content, parentId: comment.id })
                        setReplyTo(null)
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ReportModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType='comment'
        targetId={reportTarget?.id ?? ''}
        targetLabel={reportTarget?.content.slice(0, 60) ?? null}
      />
    </section>
  )
}
