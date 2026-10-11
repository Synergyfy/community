export function LoadingScreen() {
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='flex flex-col items-center gap-4'>
        <div className='w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin' />
        <p className='text-sm text-gray-600'>Loading...</p>
      </div>
    </div>
  )
}
