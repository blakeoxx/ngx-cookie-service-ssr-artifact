import { Inject, Injectable, InjectionToken, Optional, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import * as i0 from "@angular/core";
// Define the `Request` and `Response` token
export const REQUEST = new InjectionToken('REQUEST');
export const RESPONSE = new InjectionToken('RESPONSE');
export class SsrCookieService {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3NyLWNvb2tpZS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LWNvb2tpZS1zZXJ2aWNlLXNzci9zcmMvbGliL3Nzci1jb29raWUuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7O0FBRTlELDRDQUE0QztBQUM1QyxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLENBQVUsU0FBUyxDQUFDLENBQUM7QUFDOUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxDQUFXLFVBQVUsQ0FBQyxDQUFDO0FBS2pFLE1BQU0sT0FBTyxnQkFBZ0I7SUFHM0IsWUFDNEIsUUFBa0I7SUFDNUMsK0RBQStEO0lBQ2xDLFVBQWUsRUFDUCxPQUFnQixFQUNmLFFBQWtCO1FBSjlCLGFBQVEsR0FBUixRQUFRLENBQVU7UUFFZixlQUFVLEdBQVYsVUFBVSxDQUFLO1FBQ1AsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNmLGFBQVEsR0FBUixRQUFRLENBQVU7UUFFeEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQVk7UUFDakMsTUFBTSxXQUFXLEdBQVcsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3Q0FBd0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUzRixPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxXQUFXLEdBQUcsUUFBUSxHQUFHLFdBQVcsR0FBRyxnQkFBZ0IsRUFBRSxH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bkMsS0FBSyxNQUFNLFVBQVUsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNqQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUQsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDOzhHQXRaVSxnQkFBZ0Isa0JBSWpCLFFBQVEsYUFFUixXQUFXLGFBQ0MsT0FBTyw2QkFDUCxRQUFRO2tIQVJuQixnQkFBZ0IsY0FGZixNQUFNOzsyRkFFUCxnQkFBZ0I7a0JBSDVCLFVBQVU7bUJBQUM7b0JBQ1YsVUFBVSxFQUFFLE1BQU07aUJBQ25COzswQkFLSSxNQUFNOzJCQUFDLFFBQVE7OzBCQUVmLE1BQU07MkJBQUMsV0FBVzs7MEJBQ2xCLFFBQVE7OzBCQUFJLE1BQU07MkJBQUMsT0FBTzs7MEJBQzFCLFFBQVE7OzBCQUFJLE1BQU07MkJBQUMsUUFBUSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvb2tpZU9wdGlvbnMsIFJlcXVlc3QsIFJlc3BvbnNlIH0gZnJvbSAnZXhwcmVzcyc7XHJcbmltcG9ydCB7IEluamVjdCwgSW5qZWN0YWJsZSwgSW5qZWN0aW9uVG9rZW4sIE9wdGlvbmFsLCBQTEFURk9STV9JRCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBET0NVTUVOVCwgaXNQbGF0Zm9ybUJyb3dzZXIgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xyXG5cclxuLy8gRGVmaW5lIHRoZSBgUmVxdWVzdGAgYW5kIGBSZXNwb25zZWAgdG9rZW5cclxuZXhwb3J0IGNvbnN0IFJFUVVFU1QgPSBuZXcgSW5qZWN0aW9uVG9rZW48UmVxdWVzdD4oJ1JFUVVFU1QnKTtcclxuZXhwb3J0IGNvbnN0IFJFU1BPTlNFID0gbmV3IEluamVjdGlvblRva2VuPFJlc3BvbnNlPignUkVTUE9OU0UnKTtcclxuXHJcbkBJbmplY3RhYmxlKHtcclxuICBwcm92aWRlZEluOiAncm9vdCcsXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBTc3JDb29raWVTZXJ2aWNlIHtcclxuICBwcml2YXRlIHJlYWRvbmx5IGRvY3VtZW50SXNBY2Nlc3NpYmxlOiBib29sZWFuO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIEBJbmplY3QoRE9DVU1FTlQpIHByaXZhdGUgZG9jdW1lbnQ6IERvY3VtZW50LFxyXG4gICAgLy8gR2V0IHRoZSBgUExBVEZPUk1fSURgIHNvIHdlIGNhbiBjaGVjayBpZiB3ZSdyZSBpbiBhIGJyb3dzZXIuXHJcbiAgICBASW5qZWN0KFBMQVRGT1JNX0lEKSBwcml2YXRlIHBsYXRmb3JtSWQ6IGFueSxcclxuICAgIEBPcHRpb25hbCgpIEBJbmplY3QoUkVRVUVTVCkgcHJpdmF0ZSByZXF1ZXN0OiBSZXF1ZXN0LFxyXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChSRVNQT05TRSkgcHJpdmF0ZSByZXNwb25zZTogUmVzcG9uc2VcclxuICApIHtcclxuICAgIHRoaXMuZG9jdW1lbnRJc0FjY2Vzc2libGUgPSBpc1BsYXRmb3JtQnJvd3Nlcih0aGlzLnBsYXRmb3JtSWQpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGNvb2tpZSBSZWd1bGFyIEV4cHJlc3Npb25cclxuICAgKlxyXG4gICAqIEBwYXJhbSBuYW1lIENvb2tpZSBuYW1lXHJcbiAgICogQHJldHVybnMgcHJvcGVydHkgUmVnRXhwXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBzdGF0aWMgZ2V0Q29va2llUmVnRXhwKG5hbWU6IHN0cmluZyk6IFJlZ0V4cCB7XHJcbiAgICBjb25zdCBlc2NhcGVkTmFtZTogc3RyaW5nID0gbmFtZS5yZXBsYWNlKC8oW1xcW1xcXVxce1xcfVxcKFxcKVxcfFxcPVxcO1xcK1xcP1xcLFxcLlxcKlxcXlxcJF0pL2dpLCAnXFxcXCQxJyk7XHJcblxyXG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoJyg/Ol4nICsgZXNjYXBlZE5hbWUgKyAnfDtcXFxccyonICsgZXNjYXBlZE5hbWUgKyAnKT0oLio/KSg/Ojt8JCknLCAnZycpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgdW5lbmNvZGVkIHZlcnNpb24gb2YgYW4gZW5jb2RlZCBjb21wb25lbnQgb2YgYSBVbmlmb3JtIFJlc291cmNlIElkZW50aWZpZXIgKFVSSSkuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gZW5jb2RlZFVSSUNvbXBvbmVudCBBIHZhbHVlIHJlcHJlc2VudGluZyBhbiBlbmNvZGVkIFVSSSBjb21wb25lbnQuXHJcbiAgICpcclxuICAgKiBAcmV0dXJucyBUaGUgdW5lbmNvZGVkIHZlcnNpb24gb2YgYW4gZW5jb2RlZCBjb21wb25lbnQgb2YgYSBVbmlmb3JtIFJlc291cmNlIElkZW50aWZpZXIgKFVSSSkuXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBzdGF0aWMgc2FmZURlY29kZVVSSUNvbXBvbmVudChlbmNvZGVkVVJJQ29tcG9uZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlbmNvZGVkVVJJQ29tcG9uZW50KTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAvLyBwcm9iYWJseSBpdCBpcyBub3QgdXJpIGVuY29kZWQuIHJldHVybiBhcyBpc1xyXG4gICAgICByZXR1cm4gZW5jb2RlZFVSSUNvbXBvbmVudDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnRzIHRoZSBwcm92aWRlZCBjb29raWUgc3RyaW5nIHRvIGEga2V5LXZhbHVlIHJlcHJlc2VudGF0aW9uLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIGNvb2tpZVN0cmluZyAtIEEgY29uY2F0ZW5hdGVkIHN0cmluZyBvZiBjb29raWVzXHJcbiAgICogQHJldHVybnMgTWFwIC0gS2V5LXZhbHVlIHBhaXJzIG9mIHRoZSBwcm92aWRlZCBjb29raWVzXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBCbGFrZSBCYWxsYXJkIChibGFrZW94eClcclxuICAgKiBAc2luY2U6IDE2LjIuMFxyXG4gICAqIEBzZWUge0BsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9zdGV2ZXJtZWlzdGVyL25neC1jb29raWUtc2VydmljZS9ibG9iL2Y3NjI1ZDc4OWRjMThlYTZhZWJjZjEzNmVkYjRjYzAxZWVhYzVkZTkvcHJvamVjdHMvbmd4LWNvb2tpZS1zZXJ2aWNlLXNzci9zcmMvbGliL3Nzci1jb29raWUuc2VydmljZS50cyNMMTAwfVxyXG4gICAqICBmb3IgcHJldmlvdXMgaW1wbGVtZW50YXRpb24gb2YgcGFyc2luZyBsb2dpY1xyXG4gICAqL1xyXG4gICBzdGF0aWMgY29va2llU3RyaW5nVG9NYXAoY29va2llU3RyaW5nOiBzdHJpbmcpOiBNYXA8c3RyaW5nLCBzdHJpbmc+IHtcclxuICAgIGNvbnN0IGNvb2tpZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPjtcclxuXHJcbiAgICBpZiAoY29va2llU3RyaW5nPy5sZW5ndGggPCAxKSB7XHJcbiAgICAgIHJldHVybiBjb29raWVzO1xyXG4gICAgfVxyXG5cclxuICAgIGNvb2tpZVN0cmluZy5zcGxpdCgnOycpLmZvckVhY2goKGN1cnJlbnRDb29raWUpID0+IHtcclxuICAgICAgbGV0IFtjb29raWVOYW1lLCBjb29raWVWYWx1ZV0gPSBjdXJyZW50Q29va2llLnNwbGl0KCc9Jyk7XHJcblxyXG4gICAgICAvLyBSZW1vdmUgYW55IGV4dHJhIHNwYWNlcyBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgY29va2llIG5hbWVzLiBUaGVzZSBhcmUgYSBzaWRlIGVmZmVjdCBvZiBicm93c2VyL2V4cHJlc3MgY29va2llIGNvbmNhdGVuYXRpb25cclxuICAgICAgY29va2llTmFtZSA9IGNvb2tpZU5hbWUucmVwbGFjZSgvXiArLywgJycpO1xyXG5cclxuICAgICAgY29va2llcy5zZXQoU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KGNvb2tpZU5hbWUpLCBTc3JDb29raWVTZXJ2aWNlLnNhZmVEZWNvZGVVUklDb21wb25lbnQoY29va2llVmFsdWUpKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjb29raWVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0cyB0aGUgY3VycmVudCBzdGF0ZSBvZiBhbGwgY29va2llcyBiYXNlZCBvbiB0aGUgcmVxdWVzdCBhbmQgcmVzcG9uc2UuIENvb2tpZXMgYWRkZWQgb3IgY2hhbmdlZCBpbiB0aGUgcmVzcG9uc2VcclxuICAgKiBvdmVycmlkZSBhbnkgb2xkIHZhbHVlcyBwcm92aWRlZCBpbiB0aGUgcmVzcG9uc2UuXHJcbiAgICpcclxuICAgKiBDbGllbnQtc2lkZSB3aWxsIGFsd2F5cyBqdXN0IHJldHVybiB0aGUgZG9jdW1lbnQncyBjb29raWVzLlxyXG4gICAqXHJcbiAgICogQHByaXZhdGVcclxuICAgKiBAcmV0dXJucyBNYXAgLSBBbGwgY29va2llcyBmcm9tIHRoZSByZXF1ZXN0IGFuZCByZXNwb25zZSAob3IgZG9jdW1lbnQpIGluIGtleS12YWx1ZSBmb3JtLlxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogQmxha2UgQmFsbGFyZCAoYmxha2VveHgpXHJcbiAgICogQHNpbmNlOiAxNi4yLjBcclxuICAgKiBAc2VlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vc3RldmVybWVpc3Rlci9uZ3gtY29va2llLXNlcnZpY2UvYmxvYi9mNzYyNWQ3ODlkYzE4ZWE2YWViY2YxMzZlZGI0Y2MwMWVlYWM1ZGU5L3Byb2plY3RzL25neC1jb29raWUtc2VydmljZS1zc3Ivc3JjL2xpYi9zc3ItY29va2llLnNlcnZpY2UudHMjTDEwMH1cclxuICAgKiAgZm9yIHByZXZpb3VzIGltcGxlbWVudGF0aW9uIG9mIHBhcnNpbmcgbG9naWNcclxuICAgKi9cclxuICBwcml2YXRlIGdldENvbWJpbmVkQ29va2llcygpOiBNYXA8c3RyaW5nLCBzdHJpbmc+IHtcclxuICAgIGlmICh0aGlzLmRvY3VtZW50SXNBY2Nlc3NpYmxlKSB7XHJcbiAgICAgIHJldHVybiBTc3JDb29raWVTZXJ2aWNlLmNvb2tpZVN0cmluZ1RvTWFwKHRoaXMuZG9jdW1lbnQuY29va2llKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0Q29va2llcyA9IFNzckNvb2tpZVNlcnZpY2UuY29va2llU3RyaW5nVG9NYXAodGhpcy5yZXF1ZXN0Py5oZWFkZXJzLmNvb2tpZSB8fCAnJyk7XHJcblxyXG4gICAgbGV0IHJlc3BvbnNlQ29va2llczogc3RyaW5nIHwgc3RyaW5nW10gPSAodGhpcy5yZXNwb25zZT8uZ2V0KCdTZXQtQ29va2llJykgfHwgW10pO1xyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc3BvbnNlQ29va2llcykpIHtcclxuICAgICAgcmVzcG9uc2VDb29raWVzID0gW3Jlc3BvbnNlQ29va2llc107XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGFsbENvb2tpZXMgPSBuZXcgTWFwKHJlcXVlc3RDb29raWVzKTtcclxuICAgIC8vIFBhcnNlIGFuZCBtZXJnZSByZXNwb25zZSBjb29raWVzIHdpdGggcmVxdWVzdCBjb29raWVzXHJcbiAgICByZXNwb25zZUNvb2tpZXMuZm9yRWFjaCgoY3VycmVudENvb2tpZSkgPT4ge1xyXG4gICAgICAvLyBSZXNwb25zZSBjb29raWUgaGVhZGVycyByZXByZXNlbnQgaW5kaXZpZHVhbCBjb29raWVzIGFuZCB0aGVpciBvcHRpb25zLCBzbyB3ZSBwYXJzZSB0aGVtIHNpbWlsYXIgdG8gb3RoZXIgY29va2llIHN0cmluZ3MsIGJ1dCBzbGlnaHRseSBkaWZmZXJlbnRcclxuICAgICAgbGV0IFtjb29raWVOYW1lLCBjb29raWVWYWx1ZV0gPSBjdXJyZW50Q29va2llLnNwbGl0KCc7JylbMF0uc3BsaXQoJz0nKTtcclxuICAgICAgaWYgKGNvb2tpZU5hbWUgIT09ICcnKSB7XHJcbiAgICAgICAgYWxsQ29va2llcy5zZXQoU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KGNvb2tpZU5hbWUpLCBTc3JDb29raWVTZXJ2aWNlLnNhZmVEZWNvZGVVUklDb21wb25lbnQoY29va2llVmFsdWUpKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGFsbENvb2tpZXM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTYXZlcyBhIGNvb2tpZSB0byB0aGUgY2xpZW50LXNpZGUgZG9jdW1lbnRcclxuICAgKlxyXG4gICAqIEBwYXJhbSBuYW1lXHJcbiAgICogQHBhcmFtIHZhbHVlXHJcbiAgICogQHBhcmFtIG9wdGlvbnNcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogQmxha2UgQmFsbGFyZCAoYmxha2VveHgpXHJcbiAgICogQHNpbmNlOiAxNi4yLjBcclxuICAgKiBAc2VlIHtAbGluayBzZXR9IGZvciB0aGUgb3JpZ2luYWwgY2xpZW50LXNpZGUgY29va2llIHNldHRlciBsb2dpYy4gVGhpcyBsb2dpYyBpcyBtb3N0bHkgc3RyYWlnaHQgZnJvbSB0aGVyZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgc2V0Q2xpZW50Q29va2llKFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgdmFsdWU6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IHtcclxuICAgICAgZXhwaXJlcz86IG51bWJlciB8IERhdGU7XHJcbiAgICAgIHBhdGg/OiBzdHJpbmc7XHJcbiAgICAgIGRvbWFpbj86IHN0cmluZztcclxuICAgICAgc2VjdXJlPzogYm9vbGVhbjtcclxuICAgICAgc2FtZVNpdGU/OiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnO1xyXG4gICAgICBwYXJ0aXRpb25lZD86IGJvb2xlYW47XHJcbiAgICB9ID0ge31cclxuICApOiB2b2lkIHtcclxuICAgIGxldCBjb29raWVTdHJpbmc6IHN0cmluZyA9IGVuY29kZVVSSUNvbXBvbmVudChuYW1lKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkgKyAnOyc7XHJcblxyXG4gICAgaWYgKG9wdGlvbnMuZXhwaXJlcykge1xyXG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZXhwaXJlcyA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICBjb25zdCBkYXRlRXhwaXJlczogRGF0ZSA9IG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgb3B0aW9ucy5leHBpcmVzICogMTAwMCAqIDYwICogNjAgKiAyNCk7XHJcblxyXG4gICAgICAgIGNvb2tpZVN0cmluZyArPSAnZXhwaXJlcz0nICsgZGF0ZUV4cGlyZXMudG9VVENTdHJpbmcoKSArICc7JztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb29raWVTdHJpbmcgKz0gJ2V4cGlyZXM9JyArIG9wdGlvbnMuZXhwaXJlcy50b1VUQ1N0cmluZygpICsgJzsnO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG9wdGlvbnMucGF0aCkge1xyXG4gICAgICBjb29raWVTdHJpbmcgKz0gJ3BhdGg9JyArIG9wdGlvbnMucGF0aCArICc7JztcclxuICAgIH1cclxuXHJcbiAgICBpZiAob3B0aW9ucy5kb21haW4pIHtcclxuICAgICAgY29va2llU3RyaW5nICs9ICdkb21haW49JyArIG9wdGlvbnMuZG9tYWluICsgJzsnO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLnNlY3VyZSA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zYW1lU2l0ZSA9PT0gJ05vbmUnKSB7XHJcbiAgICAgIG9wdGlvbnMuc2VjdXJlID0gdHJ1ZTtcclxuICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgIGBbbmd4LWNvb2tpZS1zZXJ2aWNlXSBDb29raWUgJHtuYW1lfSB3YXMgZm9yY2VkIHdpdGggc2VjdXJlIGZsYWcgYmVjYXVzZSBzYW1lU2l0ZT1Ob25lLmAgK1xyXG4gICAgICAgIGBNb3JlIGRldGFpbHMgOiBodHRwczovL2dpdGh1Yi5jb20vc3RldmVybWVpc3Rlci9uZ3gtY29va2llLXNlcnZpY2UvaXNzdWVzLzg2I2lzc3VlY29tbWVudC01OTc3MjAxMzBgXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBpZiAob3B0aW9ucy5zZWN1cmUpIHtcclxuICAgICAgY29va2llU3RyaW5nICs9ICdzZWN1cmU7JztcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIW9wdGlvbnMuc2FtZVNpdGUpIHtcclxuICAgICAgb3B0aW9ucy5zYW1lU2l0ZSA9ICdMYXgnO1xyXG4gICAgfVxyXG5cclxuICAgIGNvb2tpZVN0cmluZyArPSAnc2FtZVNpdGU9JyArIG9wdGlvbnMuc2FtZVNpdGUgKyAnOyc7XHJcblxyXG4gICAgaWYgKG9wdGlvbnMucGFydGl0aW9uZWQpIHtcclxuICAgICAgY29va2llU3RyaW5nICs9ICdQYXJ0aXRpb25lZDsnO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZG9jdW1lbnQuY29va2llID0gY29va2llU3RyaW5nO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2F2ZXMgYSBjb29raWUgdG8gdGhlIHNlcnZlci1zaWRlIHJlc3BvbnNlIGNvb2tpZSBoZWFkZXJzXHJcbiAgICpcclxuICAgKiBAcGFyYW0gbmFtZVxyXG4gICAqIEBwYXJhbSB2YWx1ZVxyXG4gICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICogQHByaXZhdGVcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IEJsYWtlIEJhbGxhcmQgKGJsYWtlb3h4KVxyXG4gICAqIEBzaW5jZTogMTYuMi4wXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzZXRTZXJ2ZXJDb29raWUoXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICB2YWx1ZTogc3RyaW5nLFxyXG4gICAgb3B0aW9uczoge1xyXG4gICAgICBleHBpcmVzPzogbnVtYmVyIHwgRGF0ZTtcclxuICAgICAgcGF0aD86IHN0cmluZztcclxuICAgICAgZG9tYWluPzogc3RyaW5nO1xyXG4gICAgICBzZWN1cmU/OiBib29sZWFuO1xyXG4gICAgICBzYW1lU2l0ZT86ICdMYXgnIHwgJ05vbmUnIHwgJ1N0cmljdCc7XHJcbiAgICAgIHBhcnRpdGlvbmVkPzogYm9vbGVhbjtcclxuICAgIH0gPSB7fVxyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3QgZXhwcmVzc09wdGlvbnM6IENvb2tpZU9wdGlvbnMgPSB7fTtcclxuXHJcbiAgICBpZiAob3B0aW9ucy5leHBpcmVzKSB7XHJcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5leHBpcmVzID09PSAnbnVtYmVyJykge1xyXG4gICAgICAgIGV4cHJlc3NPcHRpb25zLmV4cGlyZXMgPSBuZXcgRGF0ZShuZXcgRGF0ZSgpLmdldFRpbWUoKSArIG9wdGlvbnMuZXhwaXJlcyAqIDEwMDAgKiA2MCAqIDYwICogMjQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGV4cHJlc3NPcHRpb25zLmV4cGlyZXMgPSBvcHRpb25zLmV4cGlyZXM7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAob3B0aW9ucy5wYXRoKSB7XHJcbiAgICAgIGV4cHJlc3NPcHRpb25zLnBhdGggPSBvcHRpb25zLnBhdGg7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG9wdGlvbnMuZG9tYWluKSB7XHJcbiAgICAgIGV4cHJlc3NPcHRpb25zLmRvbWFpbiA9IG9wdGlvbnMuZG9tYWluO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLnNlY3VyZSkge1xyXG4gICAgICBleHByZXNzT3B0aW9ucy5zZWN1cmUgPSBvcHRpb25zLnNlY3VyZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAob3B0aW9ucy5zYW1lU2l0ZSkge1xyXG4gICAgICBleHByZXNzT3B0aW9ucy5zYW1lU2l0ZSA9IG9wdGlvbnMuc2FtZVNpdGUudG9Mb3dlckNhc2UoKSBhcyAoJ2xheCcgfCAnbm9uZScgfCAnc3RyaWN0Jyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG9wdGlvbnMucGFydGl0aW9uZWQpIHtcclxuICAgICAgZXhwcmVzc09wdGlvbnMucGFydGl0aW9uZWQgPSBvcHRpb25zLnBhcnRpdGlvbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucmVzcG9uc2U/LmNvb2tpZShuYW1lLCB2YWx1ZSwgZXhwcmVzc09wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmV0dXJuIGB0cnVlYCBpZiB7QGxpbmsgRG9jdW1lbnR9IGlzIGFjY2Vzc2libGUsIG90aGVyd2lzZSByZXR1cm4gYGZhbHNlYFxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgQ29va2llIG5hbWVcclxuICAgKiBAcmV0dXJucyBib29sZWFuIC0gd2hldGhlciBjb29raWUgd2l0aCBzcGVjaWZpZWQgbmFtZSBleGlzdHNcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IFN0ZXBhbiBTdXZvcm92XHJcbiAgICogQHNpbmNlOiAxLjAuMFxyXG4gICAqL1xyXG4gIGNoZWNrKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgYWxsQ29va2llcyA9IHRoaXMuZ2V0Q29tYmluZWRDb29raWVzKCk7XHJcbiAgICByZXR1cm4gYWxsQ29va2llcy5oYXMobmFtZSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgY29va2llcyBieSBuYW1lXHJcbiAgICpcclxuICAgKiBAcGFyYW0gbmFtZSBDb29raWUgbmFtZVxyXG4gICAqIEByZXR1cm5zIHByb3BlcnR5IHZhbHVlXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBnZXQobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGFsbENvb2tpZXMgPSB0aGlzLmdldENvbWJpbmVkQ29va2llcygpO1xyXG4gICAgcmV0dXJuIChhbGxDb29raWVzLmdldChuYW1lKSB8fCAnJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgYWxsIGNvb2tpZXMgaW4gSlNPTiBmb3JtYXRcclxuICAgKlxyXG4gICAqIEByZXR1cm5zIGFsbCB0aGUgY29va2llcyBpbiBqc29uXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBnZXRBbGwoKTogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSB7XHJcbiAgICBjb25zdCBhbGxDb29raWVzID0gdGhpcy5nZXRDb21iaW5lZENvb2tpZXMoKTtcclxuICAgIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMoYWxsQ29va2llcyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZXQgY29va2llIGJhc2VkIG9uIHByb3ZpZGVkIGluZm9ybWF0aW9uXHJcbiAgICpcclxuICAgKiBAcGFyYW0gbmFtZSAgICAgQ29va2llIG5hbWVcclxuICAgKiBAcGFyYW0gdmFsdWUgICAgQ29va2llIHZhbHVlXHJcbiAgICogQHBhcmFtIGV4cGlyZXMgIE51bWJlciBvZiBkYXlzIHVudGlsIHRoZSBjb29raWVzIGV4cGlyZXMgb3IgYW4gYWN0dWFsIGBEYXRlYFxyXG4gICAqIEBwYXJhbSBwYXRoICAgICBDb29raWUgcGF0aFxyXG4gICAqIEBwYXJhbSBkb21haW4gICBDb29raWUgZG9tYWluXHJcbiAgICogQHBhcmFtIHNlY3VyZSAgIFNlY3VyZSBmbGFnXHJcbiAgICogQHBhcmFtIHNhbWVTaXRlIE9XQVNQIHNhbWUgc2l0ZSB0b2tlbiBgTGF4YCwgYE5vbmVgLCBvciBgU3RyaWN0YC4gRGVmYXVsdHMgdG8gYExheGBcclxuICAgKiBAcGFyYW0gcGFydGl0aW9uZWQgUGFydGl0aW9uZWQgZmxhZ1xyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgc2V0KFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgdmFsdWU6IHN0cmluZyxcclxuICAgIGV4cGlyZXM/OiBudW1iZXIgfCBEYXRlLFxyXG4gICAgcGF0aD86IHN0cmluZyxcclxuICAgIGRvbWFpbj86IHN0cmluZyxcclxuICAgIHNlY3VyZT86IGJvb2xlYW4sXHJcbiAgICBzYW1lU2l0ZT86ICdMYXgnIHwgJ05vbmUnIHwgJ1N0cmljdCcsXHJcbiAgICBwYXJ0aXRpb25lZD86IGJvb2xlYW5cclxuICApOiB2b2lkO1xyXG5cclxuICAvKipcclxuICAgKiBTZXQgY29va2llIGJhc2VkIG9uIHByb3ZpZGVkIGluZm9ybWF0aW9uXHJcbiAgICpcclxuICAgKiBDb29raWUncyBwYXJhbWV0ZXJzOlxyXG4gICAqIDxwcmU+XHJcbiAgICogZXhwaXJlcyAgTnVtYmVyIG9mIGRheXMgdW50aWwgdGhlIGNvb2tpZXMgZXhwaXJlcyBvciBhbiBhY3R1YWwgYERhdGVgXHJcbiAgICogcGF0aCAgICAgQ29va2llIHBhdGhcclxuICAgKiBkb21haW4gICBDb29raWUgZG9tYWluXHJcbiAgICogc2VjdXJlIENvb2tpZSBzZWN1cmUgZmxhZ1xyXG4gICAqIHNhbWVTaXRlIE9XQVNQIHNhbWUgc2l0ZSB0b2tlbiBgTGF4YCwgYE5vbmVgLCBvciBgU3RyaWN0YC4gRGVmYXVsdHMgdG8gYExheGBcclxuICAgKiA8L3ByZT5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBuYW1lICAgICBDb29raWUgbmFtZVxyXG4gICAqIEBwYXJhbSB2YWx1ZSAgICBDb29raWUgdmFsdWVcclxuICAgKiBAcGFyYW0gb3B0aW9ucyAgQm9keSB3aXRoIGNvb2tpZSdzIHBhcmFtc1xyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgc2V0KFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgdmFsdWU6IHN0cmluZyxcclxuICAgIG9wdGlvbnM/OiB7XHJcbiAgICAgIGV4cGlyZXM/OiBudW1iZXIgfCBEYXRlO1xyXG4gICAgICBwYXRoPzogc3RyaW5nO1xyXG4gICAgICBkb21haW4/OiBzdHJpbmc7XHJcbiAgICAgIHNlY3VyZT86IGJvb2xlYW47XHJcbiAgICAgIHNhbWVTaXRlPzogJ0xheCcgfCAnTm9uZScgfCAnU3RyaWN0JztcclxuICAgICAgcGFydGl0aW9uZWQ/OiBib29sZWFuO1xyXG4gICAgfVxyXG4gICk6IHZvaWQ7XHJcblxyXG4gIHNldChcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHZhbHVlOiBzdHJpbmcsXHJcbiAgICBleHBpcmVzT3JPcHRpb25zPzogbnVtYmVyIHwgRGF0ZSB8IGFueSxcclxuICAgIHBhdGg/OiBzdHJpbmcsXHJcbiAgICBkb21haW4/OiBzdHJpbmcsXHJcbiAgICBzZWN1cmU/OiBib29sZWFuLFxyXG4gICAgc2FtZVNpdGU/OiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnLFxyXG4gICAgcGFydGl0aW9uZWQ/OiBib29sZWFuXHJcbiAgKTogdm9pZCB7XHJcbiAgICBpZiAodHlwZW9mIGV4cGlyZXNPck9wdGlvbnMgPT09ICdudW1iZXInIHx8IGV4cGlyZXNPck9wdGlvbnMgaW5zdGFuY2VvZiBEYXRlIHx8IHBhdGggfHwgZG9tYWluIHx8IHNlY3VyZSB8fCBzYW1lU2l0ZSkge1xyXG4gICAgICBjb25zdCBvcHRpb25zQm9keSA9IHtcclxuICAgICAgICBleHBpcmVzOiBleHBpcmVzT3JPcHRpb25zLFxyXG4gICAgICAgIHBhdGgsXHJcbiAgICAgICAgZG9tYWluLFxyXG4gICAgICAgIHNlY3VyZSxcclxuICAgICAgICBzYW1lU2l0ZTogc2FtZVNpdGUgPyBzYW1lU2l0ZSA6ICdMYXgnLFxyXG4gICAgICAgIHBhcnRpdGlvbmVkLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy5zZXQobmFtZSwgdmFsdWUsIG9wdGlvbnNCb2R5KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmRvY3VtZW50SXNBY2Nlc3NpYmxlKSB7XHJcbiAgICAgIHRoaXMuc2V0Q2xpZW50Q29va2llKG5hbWUsIHZhbHVlLCBleHBpcmVzT3JPcHRpb25zKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc2V0U2VydmVyQ29va2llKG5hbWUsIHZhbHVlLCBleHBpcmVzT3JPcHRpb25zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBjb29raWUgYnkgbmFtZVxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgICBDb29raWUgbmFtZVxyXG4gICAqIEBwYXJhbSBwYXRoICAgQ29va2llIHBhdGhcclxuICAgKiBAcGFyYW0gZG9tYWluIENvb2tpZSBkb21haW5cclxuICAgKiBAcGFyYW0gc2VjdXJlIENvb2tpZSBzZWN1cmUgZmxhZ1xyXG4gICAqIEBwYXJhbSBzYW1lU2l0ZSBDb29raWUgc2FtZVNpdGUgZmxhZyAtIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUVFAvSGVhZGVycy9TZXQtQ29va2llL1NhbWVTaXRlXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBkZWxldGUobmFtZTogc3RyaW5nLCBwYXRoPzogc3RyaW5nLCBkb21haW4/OiBzdHJpbmcsIHNlY3VyZT86IGJvb2xlYW4sIHNhbWVTaXRlOiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnID0gJ0xheCcpOiB2b2lkIHtcclxuICAgIGNvbnN0IGV4cGlyZXNEYXRlID0gbmV3IERhdGUoJ1RodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDEgR01UJyk7XHJcbiAgICB0aGlzLnNldChuYW1lLCAnJywgeyBleHBpcmVzOiBleHBpcmVzRGF0ZSwgcGF0aCwgZG9tYWluLCBzZWN1cmUsIHNhbWVTaXRlIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVsZXRlIGFsbCBjb29raWVzXHJcbiAgICpcclxuICAgKiBAcGFyYW0gcGF0aCAgIENvb2tpZSBwYXRoXHJcbiAgICogQHBhcmFtIGRvbWFpbiBDb29raWUgZG9tYWluXHJcbiAgICogQHBhcmFtIHNlY3VyZSBJcyB0aGUgQ29va2llIHNlY3VyZVxyXG4gICAqIEBwYXJhbSBzYW1lU2l0ZSBJcyB0aGUgY29va2llIHNhbWUgc2l0ZVxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgZGVsZXRlQWxsKHBhdGg/OiBzdHJpbmcsIGRvbWFpbj86IHN0cmluZywgc2VjdXJlPzogYm9vbGVhbiwgc2FtZVNpdGU6ICdMYXgnIHwgJ05vbmUnIHwgJ1N0cmljdCcgPSAnTGF4Jyk6IHZvaWQge1xyXG4gICAgY29uc3QgY29va2llczogYW55ID0gdGhpcy5nZXRBbGwoKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGNvb2tpZU5hbWUgaW4gY29va2llcykge1xyXG4gICAgICBpZiAoY29va2llcy5oYXNPd25Qcm9wZXJ0eShjb29raWVOYW1lKSkge1xyXG4gICAgICAgIHRoaXMuZGVsZXRlKGNvb2tpZU5hbWUsIHBhdGgsIGRvbWFpbiwgc2VjdXJlLCBzYW1lU2l0ZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19