export default defineNuxtRouteMiddleware((to) => {
  const isPos = to.path.startsWith('/pos')
  
  useHead({
    link: [
      {
        rel: 'manifest',
        href: isPos ? '/pos-manifest.json?v=2' : '/site.webmanifest?v=2'
      }
    ],
    meta: [
      {
        name: 'apple-mobile-web-app-title',
        content: isPos ? 'DB POS' : 'Drip & Brew'
      }
    ]
  })
})
