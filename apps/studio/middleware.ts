import { proxy } from './src/proxy';
export { proxy as middleware };

// Run on every request except static Next.js build output
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
