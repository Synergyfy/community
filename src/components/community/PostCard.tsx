import { Link } from 'react-router-dom'
import { Gift, MoreHorizontal, Tag, Repeat } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { PostMeta } from './PostMeta'
import { PostActions } from './PostActions'
import { MediaPreview } from './MediaPreview'
import { formatGBP, percent } from '@/lib/format'
import type { PublicPost } from '@/types/community-public'

interface PostCardProps {
  post: PublicPost
  liked?: boolean
  saved?: boolean
  onLike?: (post: PublicPost) => void
  onComment?: (post: PublicPost) => void
  onShare?: (post: PublicPost) => void
  onSave?: (post: PublicPost) => void
  onMore?: (post: PublicPost) => void
}

export function PostCard({ post, liked, saved, onLike, onComment, onShare, onSave, onMore }: PostCardProps) {
  const isCampaign = post.postType === 'campaign' || post.postType === 'campaign_update'
  const isOffer = post.postType === 'offer'
  const isReward = post.postType === 'reward'
  const isExchange = post.postType === 'exchange' || post.postType === 'exchange_update'
  const isAnnouncement = post.postType === 'admin_announcement' || post.postType === 'announcement'

  return (
    <article className='card overflow-hidden'>
      <div className='p-3 sm:p-4'>
        <div className='flex items-start gap-3'>
          <Avatar src={post.author.avatarUrl} name={post.author.name} size='md' />
          <div className='min-w-0 flex-1'>
            <div className='flex items-center justify-between gap-2'>
              <div className='min-w-0'>
                <p className='text-sm font-semibold text-gray-900 truncate'>{post.author.name}</p>
                <PostMeta post={post} className='mt-0.5' />
              </div>
              <button onClick={() => onMore?.(post)} className='btn-icon text-gray-500'>
                <MoreHorizontal className='h-5 w-5' />
              </button>
            </div>
          </div>
        </div>

        {isCampaign && (
          <div className='mt-3'>
            <div className='flex items-center gap-1.5 mb-2'>
              <span className='badge-primary'>Campaign</span>
              {post.title && <span className='text-sm font-semibold text-gray-900 truncate'>{post.title}</span>}
            </div>
            {post.mediaUrls && <MediaPreview urls={post.mediaUrls} />}
            <div className='mt-3'>
              <div className='flex items-baseline justify-between text-sm'>
                <span className='font-semibold text-gray-900'>{formatGBP(725000)} raised</span>
                <span className='text-gray-500'>72%</span>
              </div>
              <div className='mt-1.5 h-2 w-full rounded-full bg-gray-100 overflow-hidden'>
                <div className='h-full bg-secondary-500' style={{ width: `${percent(725000, 1000000)}%` }} />
              </div>
              <p className='mt-1 text-xs text-gray-500'>142 supporters</p>
            </div>
            {post.content && <p className='mt-3 text-sm text-gray-700 line-clamp-3'>{post.content}</p>}
          </div>
        )}

        {isOffer && (
          <div className='mt-3'>
            <div className='flex items-center gap-1.5 mb-2'>
              <Tag className='h-4 w-4 text-primary-600' />
              <span className='badge-primary'>Offer</span>
              {post.title && <span className='text-sm font-semibold text-gray-900 truncate'>{post.title}</span>}
            </div>
            {post.mediaUrls && <MediaPreview urls={post.mediaUrls} />}
            {post.content && <p className='mt-3 text-sm text-gray-700 line-clamp-3'>{post.content}</p>}
          </div>
        )}

        {isReward && (
          <div className='mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3'>
            <div className='flex items-center gap-2 text-amber-700'>
              <Gift className='h-4 w-4' />
              <span className='text-sm font-semibold'>Community Reward</span>
            </div>
            {post.title && <p className='mt-1 text-sm text-gray-900 font-medium'>{post.title}</p>}
            {post.content && <p className='mt-1 text-sm text-gray-700'>{post.content}</p>}
          </div>
        )}

        {isExchange && (
          <div className='mt-3 rounded-lg border border-primary-100 bg-primary-50/50 p-3'>
            <div className='flex items-center gap-2 text-primary-700'>
              <Repeat className='h-4 w-4' />
              <span className='text-sm font-semibold'>#Exchange</span>
            </div>
            {post.title && <p className='mt-1 text-sm font-medium text-gray-900'>{post.title}</p>}
            {post.content && <p className='mt-1 text-sm text-gray-700 line-clamp-3'>{post.content}</p>}
          </div>
        )}

        {isAnnouncement && (
          <div className='mt-3'>
            <div className='flex items-center gap-1.5 mb-2'>
              <span className='badge-warning'>Announcement</span>
              {post.title && <span className='text-sm font-semibold text-gray-900'>{post.title}</span>}
            </div>
            {post.mediaUrls && <MediaPreview urls={post.mediaUrls} />}
            {post.content && <p className='mt-3 text-sm text-gray-700'>{post.content}</p>}
          </div>
        )}

        {!isCampaign && !isOffer && !isReward && !isExchange && (
          <div className='mt-3'>
            {post.content && <p className='text-sm text-gray-700 whitespace-pre-line'>{post.content}</p>}
            {post.mediaUrls && <MediaPreview urls={post.mediaUrls} className='mt-3' />}
          </div>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div className='mt-2 flex flex-wrap gap-1.5'>
            {post.hashtags.map((tag) => (
              <Link
                key={tag}
                to={`/community/discover/hashtag/${tag.replace(/^#/, '').toLowerCase()}`}
                className='text-xs text-primary-600 hover:underline'
              >
                #{tag.replace(/^#/, '')}
              </Link>
            ))}
          </div>
        )}

        {(isCampaign || isOffer || isExchange) && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {isCampaign && (
              <>
                <Link
                  to={post.campaignId ? `/community/campaign/${post.campaignId}` : `/community/post/${post.id}`}
                  className='btn-primary btn-sm'
                >
                  Back This Campaign
                </Link>
                <button onClick={() => onShare?.(post)} className='btn-secondary btn-sm'>
                  Share
                </button>
              </>
            )}
            {isOffer && (
              <Link
                to={post.offerId ? `/community/offer/${post.offerId}` : `/community/post/${post.id}`}
                className='btn-primary btn-sm'
              >
                View Offer
              </Link>
            )}
            {isExchange && (
              <Link
                to={post.exchangeId ? `/community/exchange/${post.exchangeId}` : `/community/post/${post.id}`}
                className='btn-primary btn-sm'
              >
                View Exchange
              </Link>
            )}
          </div>
        )}

        <PostActions
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          shareCount={post.shareCount}
          liked={liked}
          saved={saved}
          onLike={() => onLike?.(post)}
          onComment={() => onComment?.(post)}
          onShare={() => onShare?.(post)}
          onSave={onSave ? () => onSave(post) : undefined}
        />
      </div>
    </article>
  )
}
