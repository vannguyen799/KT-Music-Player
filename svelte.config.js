import adapter from '@sveltejs/adapter-node'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    alias: {
      '$backend': 'src/server/backend',
      '$backend/*': 'src/server/backend/*',
    },
  },
}

export default config
