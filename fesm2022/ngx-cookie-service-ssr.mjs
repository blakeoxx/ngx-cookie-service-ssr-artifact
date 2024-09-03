import * as i0 from '@angular/core';
import { InjectionToken, PLATFORM_ID, Injectable, Inject, Optional } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

// Define the `Request` and `Response` token
const REQUEST = new InjectionToken('REQUEST');
const RESPONSE = new InjectionToken('RESPONSE');
class SsrCookieService {
    constructor(document, 
    // Get the `PLATFORM_ID` so we can check if we're in a browser.
    platformId, request, response) {
        this.document = document;
        this.platformId = platformId;
        this.request = request;
        this.response = response;
        this.documentIsAccessible = isPlatformBrowser(this.platformId);
    }
    /**
     * Get cookie Regular Expression
     *
     * @param name Cookie name
     * @returns property RegExp
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    static getCookieRegExp(name) {
        const escapedName = name.replace(/([\[\]\{\}\(\)\|\=\;\+\?\,\.\*\^\$])/gi, '\\$1');
        return new RegExp('(?:^' + escapedName + '|;\\s*' + escapedName + ')=(.*?)(?:;|$)', 'g');
    }
    /**
     * Gets the unencoded version of an encoded component of a Uniform Resource Identifier (URI).
     *
     * @param encodedURIComponent A value representing an encoded URI component.
     *
     * @returns The unencoded version of an encoded component of a Uniform Resource Identifier (URI).
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    static safeDecodeURIComponent(encodedURIComponent) {
        try {
            return decodeURIComponent(encodedURIComponent);
        }
        catch {
            // probably it is not uri encoded. return as is
            return encodedURIComponent;
        }
    }
    /**
     * Converts the provided cookie string to a key-value representation.
     *
     * @param cookieString - A concatenated string of cookies
     * @returns Map - Key-value pairs of the provided cookies
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     * @see {@link https://github.com/stevermeister/ngx-cookie-service/blob/f7625d789dc18ea6aebcf136edb4cc01eeac5de9/projects/ngx-cookie-service-ssr/src/lib/ssr-cookie.service.ts#L100}
     *  for previous implementation of parsing logic
     */
    static cookieStringToMap(cookieString) {
        const cookies = new Map;
        if (cookieString?.length < 1) {
            return cookies;
        }
        cookieString.split(';').forEach((currentCookie) => {
            let [cookieName, cookieValue] = currentCookie.split('=');
            // Remove any extra spaces from the beginning of cookie names. These are a side effect of browser/express cookie concatenation
            cookieName = cookieName.replace(/^ +/, '');
            cookies.set(SsrCookieService.safeDecodeURIComponent(cookieName), SsrCookieService.safeDecodeURIComponent(cookieValue));
        });
        return cookies;
    }
    /**
     * Gets the current state of all cookies based on the request and response. Cookies added or changed in the response
     * override any old values provided in the response.
     *
     * Client-side will always just return the document's cookies.
     *
     * @private
     * @returns Map - All cookies from the request and response (or document) in key-value form.
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     * @see {@link https://github.com/stevermeister/ngx-cookie-service/blob/f7625d789dc18ea6aebcf136edb4cc01eeac5de9/projects/ngx-cookie-service-ssr/src/lib/ssr-cookie.service.ts#L100}
     *  for previous implementation of parsing logic
     */
    getCombinedCookies() {
        if (this.documentIsAccessible) {
            return SsrCookieService.cookieStringToMap(this.document.cookie);
        }
        const requestCookies = SsrCookieService.cookieStringToMap(this.request?.headers.cookie || '');
        let responseCookies = (this.response?.get('Set-Cookie') || []);
        if (!Array.isArray(responseCookies)) {
            responseCookies = [responseCookies];
        }
        let allCookies = new Map(requestCookies);
        // Parse and merge response cookies with request cookies
        responseCookies.forEach((currentCookie) => {
            // Response cookie headers represent individual cookies and their options, so we parse them similar to other cookie strings, but slightly different
            let [cookieName, cookieValue] = currentCookie.split(';')[0].split('=');
            if (cookieName !== '') {
                allCookies.set(SsrCookieService.safeDecodeURIComponent(cookieName), SsrCookieService.safeDecodeURIComponent(cookieValue));
            }
        });
        return allCookies;
    }
    /**
     * Saves a cookie to the client-side document
     *
     * @param name
     * @param value
     * @param options
     * @private
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     * @see {@link set} for the original client-side cookie setter logic. This logic is mostly straight from there
     */
    setClientCookie(name, value, options = {}) {
        let cookieString = encodeURIComponent(name) + '=' + encodeURIComponent(value) + ';';
        if (options.expires) {
            if (typeof options.expires === 'number') {
                const dateExpires = new Date(new Date().getTime() + options.expires * 1000 * 60 * 60 * 24);
                cookieString += 'expires=' + dateExpires.toUTCString() + ';';
            }
            else {
                cookieString += 'expires=' + options.expires.toUTCString() + ';';
            }
        }
        if (options.path) {
            cookieString += 'path=' + options.path + ';';
        }
        if (options.domain) {
            cookieString += 'domain=' + options.domain + ';';
        }
        if (options.secure === false && options.sameSite === 'None') {
            options.secure = true;
            console.warn(`[ngx-cookie-service] Cookie ${name} was forced with secure flag because sameSite=None.` +
                `More details : https://github.com/stevermeister/ngx-cookie-service/issues/86#issuecomment-597720130`);
        }
        if (options.secure) {
            cookieString += 'secure;';
        }
        if (!options.sameSite) {
            options.sameSite = 'Lax';
        }
        cookieString += 'sameSite=' + options.sameSite + ';';
        if (options.partitioned) {
            cookieString += 'Partitioned;';
        }
        this.document.cookie = cookieString;
    }
    /**
     * Saves a cookie to the server-side response cookie headers
     *
     * @param name
     * @param value
     * @param options
     * @private
     *
     * @author: Blake Ballard (blakeoxx)
     * @since: 16.2.0
     */
    setServerCookie(name, value, options = {}) {
        const expressOptions = {};
        if (options.expires) {
            if (typeof options.expires === 'number') {
                expressOptions.expires = new Date(new Date().getTime() + options.expires * 1000 * 60 * 60 * 24);
            }
            else {
                expressOptions.expires = options.expires;
            }
        }
        if (options.path) {
            expressOptions.path = options.path;
        }
        if (options.domain) {
            expressOptions.domain = options.domain;
        }
        if (options.secure) {
            expressOptions.secure = options.secure;
        }
        if (options.sameSite) {
            expressOptions.sameSite = options.sameSite.toLowerCase();
        }
        if (options.partitioned) {
            expressOptions.partitioned = options.partitioned;
        }
        this.response?.cookie(name, value, expressOptions);
    }
    /**
     * Return `true` if {@link Document} is accessible, otherwise return `false`
     *
     * @param name Cookie name
     * @returns boolean - whether cookie with specified name exists
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    check(name) {
        const allCookies = this.getCombinedCookies();
        return allCookies.has(name);
    }
    /**
     * Get cookies by name
     *
     * @param name Cookie name
     * @returns property value
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    get(name) {
        const allCookies = this.getCombinedCookies();
        return (allCookies.get(name) || '');
    }
    /**
     * Get all cookies in JSON format
     *
     * @returns all the cookies in json
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    getAll() {
        const allCookies = this.getCombinedCookies();
        return Object.fromEntries(allCookies);
    }
    set(name, value, expiresOrOptions, path, domain, secure, sameSite, partitioned) {
        if (typeof expiresOrOptions === 'number' || expiresOrOptions instanceof Date || path || domain || secure || sameSite) {
            const optionsBody = {
                expires: expiresOrOptions,
                path,
                domain,
                secure,
                sameSite: sameSite ? sameSite : 'Lax',
                partitioned,
            };
            this.set(name, value, optionsBody);
            return;
        }
        if (this.documentIsAccessible) {
            this.setClientCookie(name, value, expiresOrOptions);
        }
        else {
            this.setServerCookie(name, value, expiresOrOptions);
        }
    }
    /**
     * Delete cookie by name
     *
     * @param name   Cookie name
     * @param path   Cookie path
     * @param domain Cookie domain
     * @param secure Cookie secure flag
     * @param sameSite Cookie sameSite flag - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    delete(name, path, domain, secure, sameSite = 'Lax') {
        const expiresDate = new Date('Thu, 01 Jan 1970 00:00:01 GMT');
        this.set(name, '', { expires: expiresDate, path, domain, secure, sameSite });
    }
    /**
     * Delete all cookies
     *
     * @param path   Cookie path
     * @param domain Cookie domain
     * @param secure Is the Cookie secure
     * @param sameSite Is the cookie same site
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    deleteAll(path, domain, secure, sameSite = 'Lax') {
        const cookies = this.getAll();
        for (const cookieName in cookies) {
            if (cookies.hasOwnProperty(cookieName)) {
                this.delete(cookieName, path, domain, secure, sameSite);
            }
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.3.9", ngImport: i0, type: SsrCookieService, deps: [{ token: DOCUMENT }, { token: PLATFORM_ID }, { token: REQUEST, optional: true }, { token: RESPONSE, optional: true }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.3.9", ngImport: i0, type: SsrCookieService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.3.9", ngImport: i0, type: SsrCookieService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: Document, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [REQUEST]
                }] }, { type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [RESPONSE]
                }] }] });

/*
 * Public API Surface of ngx-cookie-service-ssr
 */

/**
 * Generated bundle index. Do not edit.
 */

export { REQUEST, RESPONSE, SsrCookieService };
//# sourceMappingURL=ngx-cookie-service-ssr.mjs.map
