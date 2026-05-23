export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // If the request path starts with /pos, modify the HTML shell
    if (event.path && event.path.startsWith('/pos')) {
      // Rewrite manifest and apple-mobile-web-app-title tags in the server-rendered HTML
      html.head = html.head.map(tag => {
        if (tag.includes('rel="manifest"') || tag.includes("rel='manifest'")) {
          return '<link rel="manifest" href="/pos-manifest.json?v=2">'
        }
        if (tag.includes('name="apple-mobile-web-app-title"') || tag.includes("name='apple-mobile-web-app-title'")) {
          return '<meta name="apple-mobile-web-app-title" content="DB POS">'
        }
        return tag
      })
    }
  })
})
