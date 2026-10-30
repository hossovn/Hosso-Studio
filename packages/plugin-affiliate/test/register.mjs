import { registerHooks } from 'node:module'
import path from 'node:path'
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !path.extname(specifier)) return next(specifier + '.ts', context)
  return next(specifier, context)
} })
