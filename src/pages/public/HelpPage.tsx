import { useState } from 'react'
import { LifeBuoy, Send, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useNotificationsStore } from '@/stores/notifications.store'
import { cn } from '@/lib/utils'

/**
 * Help & Support (spec §4.9): report a problem and reach support. Reports are
 * recorded locally in demo mode; the server endpoint will replace this.
 */

const TOPICS = [
  { id: 'content', label: 'Content or post problem' },
  { id: 'account', label: 'Account or sign-in problem' },
  { id: 'sharing', label: 'Sharing or attribution question' },
  { id: 'exchange', label: '#Exchange problem' },
  { id: 'other', label: 'Something else' },
] as const

const HELP_TOPICS = [
  {
    title: 'How campaign sharing works',
    body: 'Every share creates a unique link. Visits are recorded when someone opens it; qualifying actions are confirmed by the server before they appear as outcomes.',
  },
  {
    title: 'Who can see my posts',
    body: 'You choose the audience when posting — everyone, signed-in members, or businesses only. Group posts are visible to group members.',
  },
  {
    title: 'Reporting content',
    body: 'Use the report option on any post to flag it to moderators. Serious issues can also be reported below.',
  },
]

export function HelpPage() {
  const addNotification = useNotificationsStore((s) => s.addNotification)
  const [topic, setTopic] = useState<string>('content')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!details.trim()) {
      setError('Tell us a little about the problem so we can help.')
      return
    }
    setError('')
    setSent(true)
    addNotification({
      type: 'system',
      title: 'Support request received',
      body: `Our team will look at your ${TOPICS.find((t) => t.id === topic)?.label.toLowerCase()}.`,
      link: '/community/help',
    })
  }

  return (
    <div className='container-page max-w-2xl space-y-4 py-3 sm:py-4'>
      <header className='space-y-1'>
        <h1 className='flex items-center gap-2 text-xl font-bold text-gray-900'>
          <LifeBuoy className='h-5 w-5 text-primary-600' /> Help & Support
        </h1>
        <p className='text-sm text-gray-600'>Get answers, or tell us when something goes wrong.</p>
      </header>

      <section className='space-y-2' aria-label='Common questions'>
        {HELP_TOPICS.map((topic_) => (
          <div key={topic_.title} className='card p-3'>
            <p className='text-sm font-semibold text-gray-900'>{topic_.title}</p>
            <p className='mt-1 text-sm text-gray-600'>{topic_.body}</p>
          </div>
        ))}
      </section>

      <section className='card p-4' aria-label='Report a problem'>
        <h2 className='flex items-center gap-1.5 text-base font-semibold text-gray-900'>
          <ShieldCheck className='h-4 w-4 text-primary-600' /> Report a problem
        </h2>

        {sent ? (
          <div className='mt-3 space-y-3'>
            <div className='rounded-lg bg-green-50 p-3 text-sm text-green-800'>
              Thank you — your report has been noted. Our support team will follow up on your
              account if they need more detail.
            </div>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                setSent(false)
                setDetails('')
              }}
            >
              Report another problem
            </Button>
          </div>
        ) : (
          <form className='mt-3 space-y-3' onSubmit={submit}>
            <div>
              <p className='label'>What is it about?</p>
              <div className='flex flex-wrap gap-1.5'>
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type='button'
                    onClick={() => setTopic(t.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm',
                      topic === t.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor='help-details' className='label'>
                Tell us what happened
              </label>
              <textarea
                id='help-details'
                className={cn('textarea-field', error && 'border-red-400')}
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder='Describe the problem, including any links or usernames involved…'
              />
              {error && <p className='error-text'>{error}</p>}
            </div>
            <div className='flex justify-end'>
              <Button type='submit' size='sm' icon={<Send className='h-4 w-4' />}>
                Send report
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
