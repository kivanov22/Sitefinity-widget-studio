import { NextRequest, NextResponse } from 'next/server';
import { RootUrlService, RENDERER_NAME } from '@progress/sitefinity-nextjs-sdk/rest-sdk';

const headerBypassHostValidationKey = 'X-SF-BYPASS-HOST-VALIDATION-KEY';
const headerBypassHostKey = 'X-SF-BYPASS-HOST';

const whitelistedServices: string[] = [];
if (process.env.SF_WHITELISTED_WEBSERVICES) {
    whitelistedServices.push(
        ...process.env.SF_WHITELISTED_WEBSERVICES.split(',').map((x) =>
            x.trim()[0] === '/' ? x.trim() : `/${x.trim()}`
        )
    );
}

const whitelistedNextJsPagePaths: string[] = [];
if (process.env.SF_WHITELISTED_NEXTJS_PATHS) {
    whitelistedNextJsPagePaths.push(
        ...process.env.SF_WHITELISTED_NEXTJS_PATHS.split(',').map((x) =>
            x.trim()[0] === '/' ? x.trim() : `/${x.trim()}`
        )
    );
}

const whitelistedPaths: string[] = [];
if (process.env.SF_WHITELISTED_PATHS) {
    process.env.SF_WHITELISTED_PATHS.split(',')
        .map((x) => (x.trim()[0] === '/' ? x.trim() : `/${x.trim()}`))
        .forEach((p) => whitelistedPaths.push(p));
}

const servicePath = RootUrlService.getWebServicePath();

const blacklistedProxyPaths = ['/sitefinity/template', '/sitefinity/forms'];

const frontendCmsPaths = [
    `/${servicePath}`,
    '/forms/submit',
    '/sitefinity/anticsrf',
    '/sitefinity/login-handler',
    '/sitefinity/signout/selflog',
    '/ResourcePackages',
    '/web-interface/calendars',
    '/web-interface/events',
    '/kendo',
];

const adminCmsPaths = [
    '/sf/',
    '/sitefinity',
    '/Sitefinity/Services',
    '/Sitefinity/adminapp',
    '/Sitefinity/SignOut',
    '/SFSitemap/',
    '/adminapp',
    '/sf/system',
    '/ws/',
    '/restapi/',
    '/contextual-help',
    '/res/',
    '/admin-bridge/',
    '/sfres/',
    '/images/',
    '/documents/',
    '/docs/',
    '/videos/',
    '/forms/submit',
    '/ExtRes/',
    '/TranslationRes/',
    '/RBinRes/',
    '/ABTestingRes/',
    '/DataIntelligenceConnector/',
    '/signin-facebook',
    '/signin-google',
    '/signin-microsoft',
    '/signin-twitter',
    '/Frontend-Assembly/',
    '/Telerik.Sitefinity.Frontend/',
];

const allProxyPaths = [...frontendCmsPaths, ...adminCmsPaths, ...whitelistedServices, ...whitelistedPaths];

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (pathname === '/sfrenderer/api/v1/health/status') {
        return new NextResponse(undefined, { status: 200 });
    }

    // Native Next.js assets — skip CMS proxy entirely
    if (
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/assets/') ||
        pathname === '/favicon.ico' ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml' ||
        pathname === '/manifest.json'
    ) {
        return NextResponse.next();
    }

    // Studio-specific paths — served by Next.js directly, never proxied
    const studioPaths = ['/convert', '/marketplace', '/api/'];
    if (studioPaths.some((p) => pathname === p || pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // User-configured Next.js-only paths
    for (const path of whitelistedNextJsPagePaths) {
        if (pathname === path) return NextResponse.next();
    }

    // Known Sitefinity/CMS paths → proxy directly
    const proxyResult = await proxyMiddleware(request);
    if (proxyResult instanceof Response) return proxyResult;

    if (process.env.SF_PROXY_BY_DEFAULT === 'true') {
        const bypassHost = shouldBypassHost(request);
        return fetchProxiedResponse(request, bypassHost);
    }

    return NextResponse.next();
}

async function proxyMiddleware(request: NextRequest) {
    const bypassHost = shouldBypassHost(request);
    const pathname = request.nextUrl.pathname;

    if (isPathBlacklisted(pathname)) return;

    const hasAxd = pathname.indexOf('.axd') !== -1;
    const hasAshx = pathname.indexOf('.ashx') !== -1;
    const matchesProxyPath = allProxyPaths.some((p) => pathname.toUpperCase().startsWith(p.toUpperCase()));
    const isSitefinity = pathname.toLowerCase() === '/sitefinity';
    const isSitefinityRoute = /\/sitefinity\/(?!(template|forms))/i.test(pathname);
    const isAppStatus = isAppStatusRequest(request);
    const isLegacyHome = proxyHomePage(request);

    if (bypassHost || hasAxd || hasAshx || matchesProxyPath || isSitefinity || isSitefinityRoute || isAppStatus || isLegacyHome) {
        return proxyRequest(request, bypassHost);
    }
}

async function proxyRequest(request: NextRequest, bypassHost: string) {
    const { url, headers } = generateProxyRequest(request, bypassHost, true);
    const response = NextResponse.rewrite(url, { request: { headers } });
    if (bypassHost) response.headers.set('sf-cache-control-override', 'no-cache');
    return response;
}

async function fetchProxiedResponse(request: NextRequest, bypassHost: string) {
    const { url, headers } = generateProxyRequest(request, bypassHost, true);

    try {
        const proxiedResponse = await fetch(url, {
            method: request.method,
            headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
            redirect: 'manual',
        });

        if (proxiedResponse.headers.has('X-SFRENDERER-PROXY')) return NextResponse.next();

        if (proxiedResponse.status >= 300 && proxiedResponse.status < 400) {
            const locationHeader = proxiedResponse.headers.get('location');
            const urlParametersHeader = proxiedResponse.headers.get('urlparameters');
            if (urlParametersHeader && locationHeader) return NextResponse.next();
            if (!locationHeader) return NextResponse.next();
            const redirectUrl = locationHeader.startsWith('http') ? locationHeader : new URL(locationHeader, request.nextUrl.origin).toString();
            const response = NextResponse.redirect(redirectUrl, proxiedResponse.status);
            if (bypassHost) response.headers.set('sf-cache-control-override', 'no-cache');
            return response;
        }

        if (proxiedResponse.status < 200 || proxiedResponse.status >= 400) return NextResponse.next();

        const responseHeaders = new Headers(proxiedResponse.headers);
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');
        const response = new NextResponse(proxiedResponse.body, {
            status: proxiedResponse.status,
            statusText: proxiedResponse.statusText,
            headers: responseHeaders,
        });
        if (bypassHost) response.headers.set('sf-cache-control-override', 'no-cache');
        return response;
    } catch (error) {
        console.error('Proxy error:', error);
        throw error;
    }
}

function shouldBypassHost(request: NextRequest) {
    let bypassHost = '';
    const remoteValidationKey = process.env.SF_REMOTE_VALIDATION_KEY;
    if (remoteValidationKey) {
        const hasBypassKey = request.headers.has(headerBypassHostKey);
        const hasValidationKey = request.headers.has(headerBypassHostValidationKey);
        if (hasBypassKey && hasValidationKey) {
            const bypassHostKey = request.headers.get(headerBypassHostValidationKey);
            const bypassHostValue = request.headers.get(headerBypassHostKey);
            if (bypassHostKey && bypassHostValue && bypassHostKey === remoteValidationKey) {
                bypassHost = bypassHostValue;
            } else {
                throw new Error('The provided validation key is not valid or it has expired.');
            }
        }
    }
    return bypassHost;
}

function generateProxyRequest(request: NextRequest, bypassHost: string, sendRendererProxyHeaders: boolean) {
    const headers = new Headers(request.headers);
    if (sendRendererProxyHeaders) {
        headers.set('X-SFRENDERER-PROXY', 'true');
        headers.set('X-SFRENDERER-PROXY-NAME', RENDERER_NAME);
        if (!headers.has('X-SF-WEBSERVICEPATH')) {
            headers.set('X-SF-WEBSERVICEPATH', RootUrlService.getWebServicePath());
        }
    }

    if (!headers.has('x-sf-correlation-id')) {
        headers.set('x-sf-correlation-id', Math.random().toString(36).slice(2, 18));
    }

    let resolvedHost = process.env.SF_PROXY_ORIGINAL_HOST || request.headers.get('X-FORWARDED-HOST') || request.nextUrl.host || 'localhost';
    const hostHeaderName = process.env.SF_HOST_HEADER_NAME || 'X-ORIGINAL-HOST';

    if (process.env.SF_LOCAL_VALIDATION_KEY || process.env.SF_REMOTE_VALIDATION_KEY) {
        headers.delete(hostHeaderName);
        if (process.env.SF_LOCAL_VALIDATION_KEY) {
            headers.set(headerBypassHostKey, resolvedHost);
            headers.set(headerBypassHostValidationKey, process.env.SF_LOCAL_VALIDATION_KEY);
        } else if (bypassHost) {
            headers.set(hostHeaderName, bypassHost);
        } else {
            headers.set(hostHeaderName, resolvedHost);
        }
    } else {
        headers.set(hostHeaderName, resolvedHost);
    }

    const proxyURL = new URL(process.env.SF_CMS_URL!);
    let url: URL;
    try {
        url = new URL(request.url);
    } catch {
        url = new URL(request.nextUrl.href);
    }

    headers.set('HOST', proxyURL.hostname);
    url.hostname = proxyURL.hostname;
    url.protocol = proxyURL.protocol;
    url.port = proxyURL.port;

    return { url, headers };
}

function isAppStatusRequest(request: NextRequest) {
    return request.nextUrl.pathname.toLowerCase() === '/appstatus' && request.headers.get('accept')?.includes('application/json') === true;
}

function proxyHomePage(request: NextRequest) {
    return request.nextUrl.pathname === '/' && process.env.SF_IS_HOME_PAGE_LEGACY?.toLowerCase() === 'true';
}

function isPathBlacklisted(pathname: string) {
    return blacklistedProxyPaths.some((p) => pathname.toLowerCase().startsWith(p.toLowerCase()));
}
