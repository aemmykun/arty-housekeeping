import App from 'next/app'
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/nextjs')
    Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })
  } catch (e) {
    console.warn('Sentry init failed (Next.js):', e && e.message)
  }
}

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

MyApp.getInitialProps = async (appContext) => ({ ...(await App.getInitialProps(appContext)) })

export default MyApp
