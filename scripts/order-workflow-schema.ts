import hosso from '@hosso-config'
import crossSell from '../packages/plugin-cross-sell/src/index'

// Include the separately installed supplier package in release schema generation.
if (!hosso.plugins.some(plugin => plugin.id === crossSell.id)) hosso.plugins.push(crossSell)
export default import('../apps/studio/src/payload.config').then(module => module.default)
