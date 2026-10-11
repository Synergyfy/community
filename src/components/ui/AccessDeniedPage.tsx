export function AccessDeniedPage() {
  return (
    <div className='min-h-screen flex items-center justify-center p-4'>
      <div className='card max-w-md w-full'>
        <div className='card-content text-center'>
          <h2 className='text-lg font-semibold text-gray-900 mb-2'>Access Denied</h2>
          <p className='text-sm text-gray-600 mb-4'>You don't have permission to access this page.</p>
          <a href='/community' className='btn-primary'>Go to Community</a>
        </div>
      </div>
    </div>
  )
}
