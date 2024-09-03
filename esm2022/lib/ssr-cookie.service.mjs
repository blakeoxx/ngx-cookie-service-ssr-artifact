import { REQUEST, RESPONSE } from '@nguniversal/express-engine/tokens';
import { Inject, Injectable, Optional, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import * as i0 from "@angular/core";
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
        const escapedName = name.replace(/([\[\]{}()|=;+?,.*^$])/gi, '\\$1');
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
    set(name, value, expiresOrOptions, path, domain, secure, sameSite) {
        if (typeof expiresOrOptions === 'number' || expiresOrOptions instanceof Date || path || domain || secure || sameSite) {
            const optionsBody = {
                expires: expiresOrOptions,
                path,
                domain,
                secure,
                sameSite: sameSite ? sameSite : 'Lax',
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: SsrCookieService, deps: [{ token: DOCUMENT }, { token: PLATFORM_ID }, { token: REQUEST, optional: true }, { token: RESPONSE, optional: true }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: SsrCookieService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.2.12", ngImport: i0, type: SsrCookieService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: function () { return [{ type: Document, decorators: [{
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
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3NyLWNvb2tpZS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LWNvb2tpZS1zZXJ2aWNlLXNzci9zcmMvbGliL3Nzci1jb29raWUuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDOztBQUs5RCxNQUFNLE9BQU8sZ0JBQWdCO0lBRzNCLFlBQzRCLFFBQWtCO0lBQzVDLCtEQUErRDtJQUNsQyxVQUFlLEVBQ1AsT0FBZ0IsRUFDZixRQUFrQjtRQUo5QixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBRWYsZUFBVSxHQUFWLFVBQVUsQ0FBSztRQUNQLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDZixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBRXhELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFZO1FBQ2pDLE1BQU0sV0FBVyxHQUFXLElBQUksQ0FBQyxPQUFPLENBQUMsMEJBQTBCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFN0UsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsV0FBVyxHQUFHLFFBQVEsR0FBRyxXQUFXLEdBQUcsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxtQkFBMkI7UUFDdkQsSUFBSTtZQUNGLE9BQU8sa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUNoRDtRQUFDLE1BQU07WUFDTiwrQ0FBK0M7WUFDL0MsT0FBTyxtQkFBbUIsQ0FBQztTQUM1QjtJQUNILENBQUM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ0YsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFlBQW9CO1FBQzVDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBbUIsQ0FBQztRQUV4QyxJQUFJLFlBQVksRUFBRSxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzVCLE9BQU8sT0FBTyxDQUFDO1NBQ2hCO1FBRUQsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRTtZQUNoRCxJQUFJLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFekQsOEhBQThIO1lBQzlILFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUUzQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDekgsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNLLGtCQUFrQjtRQUN4QixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUM3QixPQUFPLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDakU7UUFFRCxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUM7UUFFOUYsSUFBSSxlQUFlLEdBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDbkMsZUFBZSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDckM7UUFFRCxJQUFJLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6Qyx3REFBd0Q7UUFDeEQsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBQ3hDLG1KQUFtSjtZQUNuSixJQUFJLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksVUFBVSxLQUFLLEVBQUUsRUFBRTtnQkFDckIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2FBQzNIO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSyxlQUFlLENBQ3JCLElBQVksRUFDWixLQUFhLEVBQ2IsVUFNSSxFQUFFO1FBRU4sSUFBSSxZQUFZLEdBQVcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUU1RixJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDbkIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFO2dCQUN2QyxNQUFNLFdBQVcsR0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBRWpHLFlBQVksSUFBSSxVQUFVLEdBQUcsV0FBVyxDQUFDLFdBQVcsRUFBRSxHQUFHLEdBQUcsQ0FBQzthQUM5RDtpQkFBTTtnQkFDTCxZQUFZLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDO2FBQ2xFO1NBQ0Y7UUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEIsWUFBWSxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztTQUM5QztRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNsQixZQUFZLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO1NBQ2xEO1FBRUQsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLEtBQUssSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE1BQU0sRUFBRTtZQUMzRCxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUN0QixPQUFPLENBQUMsSUFBSSxDQUNWLCtCQUErQixJQUFJLHFEQUFxRDtnQkFDeEYscUdBQXFHLENBQ3RHLENBQUM7U0FDSDtRQUNELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNsQixZQUFZLElBQUksU0FBUyxDQUFDO1NBQzNCO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7WUFDckIsT0FBTyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7U0FDMUI7UUFFRCxZQUFZLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDO1FBRXJELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztJQUN0QyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNLLGVBQWUsQ0FDckIsSUFBWSxFQUNaLEtBQWEsRUFDYixVQU1JLEVBQUU7UUFFTixNQUFNLGNBQWMsR0FBa0IsRUFBRSxDQUFDO1FBRXpDLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNuQixJQUFJLE9BQU8sT0FBTyxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUU7Z0JBQ3ZDLGNBQWMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2FBQ2pHO2lCQUFNO2dCQUNMLGNBQWMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUMxQztTQUNGO1FBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hCLGNBQWMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztTQUNwQztRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNsQixjQUFjLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDeEM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDbEIsY0FBYyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1NBQ3hDO1FBRUQsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3BCLGNBQWMsQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQWlDLENBQUM7U0FDekY7UUFFRCxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNILEtBQUssQ0FBQyxJQUFZO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzdDLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxHQUFHLENBQUMsSUFBWTtRQUNkLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsTUFBTTtRQUNKLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzdDLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBaURELEdBQUcsQ0FDRCxJQUFZLEVBQ1osS0FBYSxFQUNiLGdCQUFzQyxFQUN0QyxJQUFhLEVBQ2IsTUFBZSxFQUNmLE1BQWdCLEVBQ2hCLFFBQW9DO1FBRXBDLElBQUksT0FBTyxnQkFBZ0IsS0FBSyxRQUFRLElBQUksZ0JBQWdCLFlBQVksSUFBSSxJQUFJLElBQUksSUFBSSxNQUFNLElBQUksTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUNwSCxNQUFNLFdBQVcsR0FBRztnQkFDbEIsT0FBTyxFQUFFLGdCQUFnQjtnQkFDekIsSUFBSTtnQkFDSixNQUFNO2dCQUNOLE1BQU07Z0JBQ04sUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLO2FBQ3RDLENBQUM7WUFFRixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDbkMsT0FBTztTQUNSO1FBRUQsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUU7WUFDN0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7U0FDckQ7YUFBTTtZQUNMLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1NBQ3JEO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsTUFBTSxDQUFDLElBQVksRUFBRSxJQUFhLEVBQUUsTUFBZSxFQUFFLE1BQWdCLEVBQUUsV0FBc0MsS0FBSztRQUNoSCxNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILFNBQVMsQ0FBQyxJQUFhLEVBQUUsTUFBZSxFQUFFLE1BQWdCLEVBQUUsV0FBc0MsS0FBSztRQUNyRyxNQUFNLE9BQU8sR0FBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFbkMsS0FBSyxNQUFNLFVBQVUsSUFBSSxPQUFPLEVBQUU7WUFDaEMsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6RDtTQUNGO0lBQ0gsQ0FBQzsrR0EvWFUsZ0JBQWdCLGtCQUlqQixRQUFRLGFBRVIsV0FBVyxhQUNDLE9BQU8sNkJBQ1AsUUFBUTttSEFSbkIsZ0JBQWdCLGNBRmYsTUFBTTs7NEZBRVAsZ0JBQWdCO2tCQUg1QixVQUFVO21CQUFDO29CQUNWLFVBQVUsRUFBRSxNQUFNO2lCQUNuQjs7MEJBS0ksTUFBTTsyQkFBQyxRQUFROzswQkFFZixNQUFNOzJCQUFDLFdBQVc7OzBCQUNsQixRQUFROzswQkFBSSxNQUFNOzJCQUFDLE9BQU87OzBCQUMxQixRQUFROzswQkFBSSxNQUFNOzJCQUFDLFFBQVEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb29raWVPcHRpb25zLCBSZXF1ZXN0LCBSZXNwb25zZSB9IGZyb20gJ2V4cHJlc3MnO1xyXG5pbXBvcnQgeyBSRVFVRVNULCBSRVNQT05TRSB9IGZyb20gJ0BuZ3VuaXZlcnNhbC9leHByZXNzLWVuZ2luZS90b2tlbnMnO1xyXG5pbXBvcnQgeyBJbmplY3QsIEluamVjdGFibGUsIE9wdGlvbmFsLCBQTEFURk9STV9JRCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBET0NVTUVOVCwgaXNQbGF0Zm9ybUJyb3dzZXIgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xyXG5cclxuQEluamVjdGFibGUoe1xyXG4gIHByb3ZpZGVkSW46ICdyb290JyxcclxufSlcclxuZXhwb3J0IGNsYXNzIFNzckNvb2tpZVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgZG9jdW1lbnRJc0FjY2Vzc2libGU6IGJvb2xlYW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgQEluamVjdChET0NVTUVOVCkgcHJpdmF0ZSBkb2N1bWVudDogRG9jdW1lbnQsXHJcbiAgICAvLyBHZXQgdGhlIGBQTEFURk9STV9JRGAgc28gd2UgY2FuIGNoZWNrIGlmIHdlJ3JlIGluIGEgYnJvd3Nlci5cclxuICAgIEBJbmplY3QoUExBVEZPUk1fSUQpIHByaXZhdGUgcGxhdGZvcm1JZDogYW55LFxyXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChSRVFVRVNUKSBwcml2YXRlIHJlcXVlc3Q6IFJlcXVlc3QsXHJcbiAgICBAT3B0aW9uYWwoKSBASW5qZWN0KFJFU1BPTlNFKSBwcml2YXRlIHJlc3BvbnNlOiBSZXNwb25zZVxyXG4gICkge1xyXG4gICAgdGhpcy5kb2N1bWVudElzQWNjZXNzaWJsZSA9IGlzUGxhdGZvcm1Ccm93c2VyKHRoaXMucGxhdGZvcm1JZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgY29va2llIFJlZ3VsYXIgRXhwcmVzc2lvblxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgQ29va2llIG5hbWVcclxuICAgKiBAcmV0dXJucyBwcm9wZXJ0eSBSZWdFeHBcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IFN0ZXBhbiBTdXZvcm92XHJcbiAgICogQHNpbmNlOiAxLjAuMFxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXRDb29raWVSZWdFeHAobmFtZTogc3RyaW5nKTogUmVnRXhwIHtcclxuICAgIGNvbnN0IGVzY2FwZWROYW1lOiBzdHJpbmcgPSBuYW1lLnJlcGxhY2UoLyhbXFxbXFxde30oKXw9Oys/LC4qXiRdKS9naSwgJ1xcXFwkMScpO1xyXG5cclxuICAgIHJldHVybiBuZXcgUmVnRXhwKCcoPzpeJyArIGVzY2FwZWROYW1lICsgJ3w7XFxcXHMqJyArIGVzY2FwZWROYW1lICsgJyk9KC4qPykoPzo7fCQpJywgJ2cnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIHVuZW5jb2RlZCB2ZXJzaW9uIG9mIGFuIGVuY29kZWQgY29tcG9uZW50IG9mIGEgVW5pZm9ybSBSZXNvdXJjZSBJZGVudGlmaWVyIChVUkkpLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIGVuY29kZWRVUklDb21wb25lbnQgQSB2YWx1ZSByZXByZXNlbnRpbmcgYW4gZW5jb2RlZCBVUkkgY29tcG9uZW50LlxyXG4gICAqXHJcbiAgICogQHJldHVybnMgVGhlIHVuZW5jb2RlZCB2ZXJzaW9uIG9mIGFuIGVuY29kZWQgY29tcG9uZW50IG9mIGEgVW5pZm9ybSBSZXNvdXJjZSBJZGVudGlmaWVyIChVUkkpLlxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgc3RhdGljIHNhZmVEZWNvZGVVUklDb21wb25lbnQoZW5jb2RlZFVSSUNvbXBvbmVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZW5jb2RlZFVSSUNvbXBvbmVudCk7XHJcbiAgICB9IGNhdGNoIHtcclxuICAgICAgLy8gcHJvYmFibHkgaXQgaXMgbm90IHVyaSBlbmNvZGVkLiByZXR1cm4gYXMgaXNcclxuICAgICAgcmV0dXJuIGVuY29kZWRVUklDb21wb25lbnQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb252ZXJ0cyB0aGUgcHJvdmlkZWQgY29va2llIHN0cmluZyB0byBhIGtleS12YWx1ZSByZXByZXNlbnRhdGlvbi5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBjb29raWVTdHJpbmcgLSBBIGNvbmNhdGVuYXRlZCBzdHJpbmcgb2YgY29va2llc1xyXG4gICAqIEByZXR1cm5zIE1hcCAtIEtleS12YWx1ZSBwYWlycyBvZiB0aGUgcHJvdmlkZWQgY29va2llc1xyXG4gICAqXHJcbiAgICogQGF1dGhvcjogQmxha2UgQmFsbGFyZCAoYmxha2VveHgpXHJcbiAgICogQHNpbmNlOiAxNi4yLjBcclxuICAgKiBAc2VlIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20vc3RldmVybWVpc3Rlci9uZ3gtY29va2llLXNlcnZpY2UvYmxvYi9mNzYyNWQ3ODlkYzE4ZWE2YWViY2YxMzZlZGI0Y2MwMWVlYWM1ZGU5L3Byb2plY3RzL25neC1jb29raWUtc2VydmljZS1zc3Ivc3JjL2xpYi9zc3ItY29va2llLnNlcnZpY2UudHMjTDEwMH1cclxuICAgKiAgZm9yIHByZXZpb3VzIGltcGxlbWVudGF0aW9uIG9mIHBhcnNpbmcgbG9naWNcclxuICAgKi9cclxuICAgc3RhdGljIGNvb2tpZVN0cmluZ1RvTWFwKGNvb2tpZVN0cmluZzogc3RyaW5nKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XHJcbiAgICBjb25zdCBjb29raWVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz47XHJcblxyXG4gICAgaWYgKGNvb2tpZVN0cmluZz8ubGVuZ3RoIDwgMSkge1xyXG4gICAgICByZXR1cm4gY29va2llcztcclxuICAgIH1cclxuXHJcbiAgICBjb29raWVTdHJpbmcuc3BsaXQoJzsnKS5mb3JFYWNoKChjdXJyZW50Q29va2llKSA9PiB7XHJcbiAgICAgIGxldCBbY29va2llTmFtZSwgY29va2llVmFsdWVdID0gY3VycmVudENvb2tpZS5zcGxpdCgnPScpO1xyXG5cclxuICAgICAgLy8gUmVtb3ZlIGFueSBleHRyYSBzcGFjZXMgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIGNvb2tpZSBuYW1lcy4gVGhlc2UgYXJlIGEgc2lkZSBlZmZlY3Qgb2YgYnJvd3Nlci9leHByZXNzIGNvb2tpZSBjb25jYXRlbmF0aW9uXHJcbiAgICAgIGNvb2tpZU5hbWUgPSBjb29raWVOYW1lLnJlcGxhY2UoL14gKy8sICcnKTtcclxuXHJcbiAgICAgIGNvb2tpZXMuc2V0KFNzckNvb2tpZVNlcnZpY2Uuc2FmZURlY29kZVVSSUNvbXBvbmVudChjb29raWVOYW1lKSwgU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KGNvb2tpZVZhbHVlKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gY29va2llcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgc3RhdGUgb2YgYWxsIGNvb2tpZXMgYmFzZWQgb24gdGhlIHJlcXVlc3QgYW5kIHJlc3BvbnNlLiBDb29raWVzIGFkZGVkIG9yIGNoYW5nZWQgaW4gdGhlIHJlc3BvbnNlXHJcbiAgICogb3ZlcnJpZGUgYW55IG9sZCB2YWx1ZXMgcHJvdmlkZWQgaW4gdGhlIHJlc3BvbnNlLlxyXG4gICAqXHJcbiAgICogQ2xpZW50LXNpZGUgd2lsbCBhbHdheXMganVzdCByZXR1cm4gdGhlIGRvY3VtZW50J3MgY29va2llcy5cclxuICAgKlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQHJldHVybnMgTWFwIC0gQWxsIGNvb2tpZXMgZnJvbSB0aGUgcmVxdWVzdCBhbmQgcmVzcG9uc2UgKG9yIGRvY3VtZW50KSBpbiBrZXktdmFsdWUgZm9ybS5cclxuICAgKlxyXG4gICAqIEBhdXRob3I6IEJsYWtlIEJhbGxhcmQgKGJsYWtlb3h4KVxyXG4gICAqIEBzaW5jZTogMTYuMi4wXHJcbiAgICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL3N0ZXZlcm1laXN0ZXIvbmd4LWNvb2tpZS1zZXJ2aWNlL2Jsb2IvZjc2MjVkNzg5ZGMxOGVhNmFlYmNmMTM2ZWRiNGNjMDFlZWFjNWRlOS9wcm9qZWN0cy9uZ3gtY29va2llLXNlcnZpY2Utc3NyL3NyYy9saWIvc3NyLWNvb2tpZS5zZXJ2aWNlLnRzI0wxMDB9XHJcbiAgICogIGZvciBwcmV2aW91cyBpbXBsZW1lbnRhdGlvbiBvZiBwYXJzaW5nIGxvZ2ljXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRDb21iaW5lZENvb2tpZXMoKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XHJcbiAgICBpZiAodGhpcy5kb2N1bWVudElzQWNjZXNzaWJsZSkge1xyXG4gICAgICByZXR1cm4gU3NyQ29va2llU2VydmljZS5jb29raWVTdHJpbmdUb01hcCh0aGlzLmRvY3VtZW50LmNvb2tpZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdENvb2tpZXMgPSBTc3JDb29raWVTZXJ2aWNlLmNvb2tpZVN0cmluZ1RvTWFwKHRoaXMucmVxdWVzdD8uaGVhZGVycy5jb29raWUgfHwgJycpO1xyXG5cclxuICAgIGxldCByZXNwb25zZUNvb2tpZXM6IHN0cmluZyB8IHN0cmluZ1tdID0gKHRoaXMucmVzcG9uc2U/LmdldCgnU2V0LUNvb2tpZScpIHx8IFtdKTtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShyZXNwb25zZUNvb2tpZXMpKSB7XHJcbiAgICAgIHJlc3BvbnNlQ29va2llcyA9IFtyZXNwb25zZUNvb2tpZXNdO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBhbGxDb29raWVzID0gbmV3IE1hcChyZXF1ZXN0Q29va2llcyk7XHJcbiAgICAvLyBQYXJzZSBhbmQgbWVyZ2UgcmVzcG9uc2UgY29va2llcyB3aXRoIHJlcXVlc3QgY29va2llc1xyXG4gICAgcmVzcG9uc2VDb29raWVzLmZvckVhY2goKGN1cnJlbnRDb29raWUpID0+IHtcclxuICAgICAgLy8gUmVzcG9uc2UgY29va2llIGhlYWRlcnMgcmVwcmVzZW50IGluZGl2aWR1YWwgY29va2llcyBhbmQgdGhlaXIgb3B0aW9ucywgc28gd2UgcGFyc2UgdGhlbSBzaW1pbGFyIHRvIG90aGVyIGNvb2tpZSBzdHJpbmdzLCBidXQgc2xpZ2h0bHkgZGlmZmVyZW50XHJcbiAgICAgIGxldCBbY29va2llTmFtZSwgY29va2llVmFsdWVdID0gY3VycmVudENvb2tpZS5zcGxpdCgnOycpWzBdLnNwbGl0KCc9Jyk7XHJcbiAgICAgIGlmIChjb29raWVOYW1lICE9PSAnJykge1xyXG4gICAgICAgIGFsbENvb2tpZXMuc2V0KFNzckNvb2tpZVNlcnZpY2Uuc2FmZURlY29kZVVSSUNvbXBvbmVudChjb29raWVOYW1lKSwgU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KGNvb2tpZVZhbHVlKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBhbGxDb29raWVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2F2ZXMgYSBjb29raWUgdG8gdGhlIGNsaWVudC1zaWRlIGRvY3VtZW50XHJcbiAgICpcclxuICAgKiBAcGFyYW0gbmFtZVxyXG4gICAqIEBwYXJhbSB2YWx1ZVxyXG4gICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICogQHByaXZhdGVcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IEJsYWtlIEJhbGxhcmQgKGJsYWtlb3h4KVxyXG4gICAqIEBzaW5jZTogMTYuMi4wXHJcbiAgICogQHNlZSB7QGxpbmsgc2V0fSBmb3IgdGhlIG9yaWdpbmFsIGNsaWVudC1zaWRlIGNvb2tpZSBzZXR0ZXIgbG9naWMuIFRoaXMgbG9naWMgaXMgbW9zdGx5IHN0cmFpZ2h0IGZyb20gdGhlcmVcclxuICAgKi9cclxuICBwcml2YXRlIHNldENsaWVudENvb2tpZShcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHZhbHVlOiBzdHJpbmcsXHJcbiAgICBvcHRpb25zOiB7XHJcbiAgICAgIGV4cGlyZXM/OiBudW1iZXIgfCBEYXRlO1xyXG4gICAgICBwYXRoPzogc3RyaW5nO1xyXG4gICAgICBkb21haW4/OiBzdHJpbmc7XHJcbiAgICAgIHNlY3VyZT86IGJvb2xlYW47XHJcbiAgICAgIHNhbWVTaXRlPzogJ0xheCcgfCAnTm9uZScgfCAnU3RyaWN0JztcclxuICAgIH0gPSB7fVxyXG4gICk6IHZvaWQge1xyXG4gICAgbGV0IGNvb2tpZVN0cmluZzogc3RyaW5nID0gZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSArICc7JztcclxuXHJcbiAgICBpZiAob3B0aW9ucy5leHBpcmVzKSB7XHJcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5leHBpcmVzID09PSAnbnVtYmVyJykge1xyXG4gICAgICAgIGNvbnN0IGRhdGVFeHBpcmVzOiBEYXRlID0gbmV3IERhdGUobmV3IERhdGUoKS5nZXRUaW1lKCkgKyBvcHRpb25zLmV4cGlyZXMgKiAxMDAwICogNjAgKiA2MCAqIDI0KTtcclxuXHJcbiAgICAgICAgY29va2llU3RyaW5nICs9ICdleHBpcmVzPScgKyBkYXRlRXhwaXJlcy50b1VUQ1N0cmluZygpICsgJzsnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvb2tpZVN0cmluZyArPSAnZXhwaXJlcz0nICsgb3B0aW9ucy5leHBpcmVzLnRvVVRDU3RyaW5nKCkgKyAnOyc7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAob3B0aW9ucy5wYXRoKSB7XHJcbiAgICAgIGNvb2tpZVN0cmluZyArPSAncGF0aD0nICsgb3B0aW9ucy5wYXRoICsgJzsnO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLmRvbWFpbikge1xyXG4gICAgICBjb29raWVTdHJpbmcgKz0gJ2RvbWFpbj0nICsgb3B0aW9ucy5kb21haW4gKyAnOyc7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG9wdGlvbnMuc2VjdXJlID09PSBmYWxzZSAmJiBvcHRpb25zLnNhbWVTaXRlID09PSAnTm9uZScpIHtcclxuICAgICAgb3B0aW9ucy5zZWN1cmUgPSB0cnVlO1xyXG4gICAgICBjb25zb2xlLndhcm4oXHJcbiAgICAgICAgYFtuZ3gtY29va2llLXNlcnZpY2VdIENvb2tpZSAke25hbWV9IHdhcyBmb3JjZWQgd2l0aCBzZWN1cmUgZmxhZyBiZWNhdXNlIHNhbWVTaXRlPU5vbmUuYCArXHJcbiAgICAgICAgYE1vcmUgZGV0YWlscyA6IGh0dHBzOi8vZ2l0aHViLmNvbS9zdGV2ZXJtZWlzdGVyL25neC1jb29raWUtc2VydmljZS9pc3N1ZXMvODYjaXNzdWVjb21tZW50LTU5NzcyMDEzMGBcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIGlmIChvcHRpb25zLnNlY3VyZSkge1xyXG4gICAgICBjb29raWVTdHJpbmcgKz0gJ3NlY3VyZTsnO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghb3B0aW9ucy5zYW1lU2l0ZSkge1xyXG4gICAgICBvcHRpb25zLnNhbWVTaXRlID0gJ0xheCc7XHJcbiAgICB9XHJcblxyXG4gICAgY29va2llU3RyaW5nICs9ICdzYW1lU2l0ZT0nICsgb3B0aW9ucy5zYW1lU2l0ZSArICc7JztcclxuXHJcbiAgICB0aGlzLmRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZVN0cmluZztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNhdmVzIGEgY29va2llIHRvIHRoZSBzZXJ2ZXItc2lkZSByZXNwb25zZSBjb29raWUgaGVhZGVyc1xyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWVcclxuICAgKiBAcGFyYW0gdmFsdWVcclxuICAgKiBAcGFyYW0gb3B0aW9uc1xyXG4gICAqIEBwcml2YXRlXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBCbGFrZSBCYWxsYXJkIChibGFrZW94eClcclxuICAgKiBAc2luY2U6IDE2LjIuMFxyXG4gICAqL1xyXG4gIHByaXZhdGUgc2V0U2VydmVyQ29va2llKFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgdmFsdWU6IHN0cmluZyxcclxuICAgIG9wdGlvbnM6IHtcclxuICAgICAgZXhwaXJlcz86IG51bWJlciB8IERhdGU7XHJcbiAgICAgIHBhdGg/OiBzdHJpbmc7XHJcbiAgICAgIGRvbWFpbj86IHN0cmluZztcclxuICAgICAgc2VjdXJlPzogYm9vbGVhbjtcclxuICAgICAgc2FtZVNpdGU/OiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnO1xyXG4gICAgfSA9IHt9XHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBleHByZXNzT3B0aW9uczogQ29va2llT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgIGlmIChvcHRpb25zLmV4cGlyZXMpIHtcclxuICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmV4cGlyZXMgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgZXhwcmVzc09wdGlvbnMuZXhwaXJlcyA9IG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgb3B0aW9ucy5leHBpcmVzICogMTAwMCAqIDYwICogNjAgKiAyNCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZXhwcmVzc09wdGlvbnMuZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLnBhdGgpIHtcclxuICAgICAgZXhwcmVzc09wdGlvbnMucGF0aCA9IG9wdGlvbnMucGF0aDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAob3B0aW9ucy5kb21haW4pIHtcclxuICAgICAgZXhwcmVzc09wdGlvbnMuZG9tYWluID0gb3B0aW9ucy5kb21haW47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG9wdGlvbnMuc2VjdXJlKSB7XHJcbiAgICAgIGV4cHJlc3NPcHRpb25zLnNlY3VyZSA9IG9wdGlvbnMuc2VjdXJlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLnNhbWVTaXRlKSB7XHJcbiAgICAgIGV4cHJlc3NPcHRpb25zLnNhbWVTaXRlID0gb3B0aW9ucy5zYW1lU2l0ZS50b0xvd2VyQ2FzZSgpIGFzICgnbGF4JyB8ICdub25lJyB8ICdzdHJpY3QnKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnJlc3BvbnNlPy5jb29raWUobmFtZSwgdmFsdWUsIGV4cHJlc3NPcHRpb25zKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybiBgdHJ1ZWAgaWYge0BsaW5rIERvY3VtZW50fSBpcyBhY2Nlc3NpYmxlLCBvdGhlcndpc2UgcmV0dXJuIGBmYWxzZWBcclxuICAgKlxyXG4gICAqIEBwYXJhbSBuYW1lIENvb2tpZSBuYW1lXHJcbiAgICogQHJldHVybnMgYm9vbGVhbiAtIHdoZXRoZXIgY29va2llIHdpdGggc3BlY2lmaWVkIG5hbWUgZXhpc3RzXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBjaGVjayhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGFsbENvb2tpZXMgPSB0aGlzLmdldENvbWJpbmVkQ29va2llcygpO1xyXG4gICAgcmV0dXJuIGFsbENvb2tpZXMuaGFzKG5hbWUpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGNvb2tpZXMgYnkgbmFtZVxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgQ29va2llIG5hbWVcclxuICAgKiBAcmV0dXJucyBwcm9wZXJ0eSB2YWx1ZVxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBhbGxDb29raWVzID0gdGhpcy5nZXRDb21iaW5lZENvb2tpZXMoKTtcclxuICAgIHJldHVybiAoYWxsQ29va2llcy5nZXQobmFtZSkgfHwgJycpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFsbCBjb29raWVzIGluIEpTT04gZm9ybWF0XHJcbiAgICpcclxuICAgKiBAcmV0dXJucyBhbGwgdGhlIGNvb2tpZXMgaW4ganNvblxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgZ2V0QWxsKCk6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0ge1xyXG4gICAgY29uc3QgYWxsQ29va2llcyA9IHRoaXMuZ2V0Q29tYmluZWRDb29raWVzKCk7XHJcbiAgICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKGFsbENvb2tpZXMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0IGNvb2tpZSBiYXNlZCBvbiBwcm92aWRlZCBpbmZvcm1hdGlvblxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgICAgIENvb2tpZSBuYW1lXHJcbiAgICogQHBhcmFtIHZhbHVlICAgIENvb2tpZSB2YWx1ZVxyXG4gICAqIEBwYXJhbSBleHBpcmVzICBOdW1iZXIgb2YgZGF5cyB1bnRpbCB0aGUgY29va2llcyBleHBpcmVzIG9yIGFuIGFjdHVhbCBgRGF0ZWBcclxuICAgKiBAcGFyYW0gcGF0aCAgICAgQ29va2llIHBhdGhcclxuICAgKiBAcGFyYW0gZG9tYWluICAgQ29va2llIGRvbWFpblxyXG4gICAqIEBwYXJhbSBzZWN1cmUgICBTZWN1cmUgZmxhZ1xyXG4gICAqIEBwYXJhbSBzYW1lU2l0ZSBPV0FTUCBzYW1lc2l0ZSB0b2tlbiBgTGF4YCwgYE5vbmVgLCBvciBgU3RyaWN0YC4gRGVmYXVsdHMgdG8gYExheGBcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IFN0ZXBhbiBTdXZvcm92XHJcbiAgICogQHNpbmNlOiAxLjAuMFxyXG4gICAqL1xyXG4gIHNldChuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcsIGV4cGlyZXM/OiBudW1iZXIgfCBEYXRlLCBwYXRoPzogc3RyaW5nLCBkb21haW4/OiBzdHJpbmcsIHNlY3VyZT86IGJvb2xlYW4sIHNhbWVTaXRlPzogJ0xheCcgfCAnTm9uZScgfCAnU3RyaWN0Jyk6IHZvaWQ7XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCBjb29raWUgYmFzZWQgb24gcHJvdmlkZWQgaW5mb3JtYXRpb25cclxuICAgKlxyXG4gICAqIENvb2tpZSdzIHBhcmFtZXRlcnM6XHJcbiAgICogPHByZT5cclxuICAgKiBleHBpcmVzICBOdW1iZXIgb2YgZGF5cyB1bnRpbCB0aGUgY29va2llcyBleHBpcmVzIG9yIGFuIGFjdHVhbCBgRGF0ZWBcclxuICAgKiBwYXRoICAgICBDb29raWUgcGF0aFxyXG4gICAqIGRvbWFpbiAgIENvb2tpZSBkb21haW5cclxuICAgKiBzZWN1cmUgICBTZWN1cmUgZmxhZ1xyXG4gICAqIHNhbWVTaXRlIE9XQVNQIHNhbWVzaXRlIHRva2VuIGBMYXhgLCBgTm9uZWAsIG9yIGBTdHJpY3RgLiBEZWZhdWx0cyB0byBgTGF4YFxyXG4gICAqIDwvcHJlPlxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgICAgIENvb2tpZSBuYW1lXHJcbiAgICogQHBhcmFtIHZhbHVlICAgIENvb2tpZSB2YWx1ZVxyXG4gICAqIEBwYXJhbSBvcHRpb25zICBCb2R5IHdpdGggY29va2llJ3MgcGFyYW1zXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBzZXQoXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICB2YWx1ZTogc3RyaW5nLFxyXG4gICAgb3B0aW9ucz86IHtcclxuICAgICAgZXhwaXJlcz86IG51bWJlciB8IERhdGU7XHJcbiAgICAgIHBhdGg/OiBzdHJpbmc7XHJcbiAgICAgIGRvbWFpbj86IHN0cmluZztcclxuICAgICAgc2VjdXJlPzogYm9vbGVhbjtcclxuICAgICAgc2FtZVNpdGU/OiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnO1xyXG4gICAgfVxyXG4gICk6IHZvaWQ7XHJcblxyXG4gIHNldChcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIHZhbHVlOiBzdHJpbmcsXHJcbiAgICBleHBpcmVzT3JPcHRpb25zPzogbnVtYmVyIHwgRGF0ZSB8IGFueSxcclxuICAgIHBhdGg/OiBzdHJpbmcsXHJcbiAgICBkb21haW4/OiBzdHJpbmcsXHJcbiAgICBzZWN1cmU/OiBib29sZWFuLFxyXG4gICAgc2FtZVNpdGU/OiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnXHJcbiAgKTogdm9pZCB7XHJcbiAgICBpZiAodHlwZW9mIGV4cGlyZXNPck9wdGlvbnMgPT09ICdudW1iZXInIHx8IGV4cGlyZXNPck9wdGlvbnMgaW5zdGFuY2VvZiBEYXRlIHx8IHBhdGggfHwgZG9tYWluIHx8IHNlY3VyZSB8fCBzYW1lU2l0ZSkge1xyXG4gICAgICBjb25zdCBvcHRpb25zQm9keSA9IHtcclxuICAgICAgICBleHBpcmVzOiBleHBpcmVzT3JPcHRpb25zLFxyXG4gICAgICAgIHBhdGgsXHJcbiAgICAgICAgZG9tYWluLFxyXG4gICAgICAgIHNlY3VyZSxcclxuICAgICAgICBzYW1lU2l0ZTogc2FtZVNpdGUgPyBzYW1lU2l0ZSA6ICdMYXgnLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy5zZXQobmFtZSwgdmFsdWUsIG9wdGlvbnNCb2R5KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmRvY3VtZW50SXNBY2Nlc3NpYmxlKSB7XHJcbiAgICAgIHRoaXMuc2V0Q2xpZW50Q29va2llKG5hbWUsIHZhbHVlLCBleHBpcmVzT3JPcHRpb25zKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc2V0U2VydmVyQ29va2llKG5hbWUsIHZhbHVlLCBleHBpcmVzT3JPcHRpb25zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBjb29raWUgYnkgbmFtZVxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgICBDb29raWUgbmFtZVxyXG4gICAqIEBwYXJhbSBwYXRoICAgQ29va2llIHBhdGhcclxuICAgKiBAcGFyYW0gZG9tYWluIENvb2tpZSBkb21haW5cclxuICAgKiBAcGFyYW0gc2VjdXJlIENvb2tpZSBzZWN1cmUgZmxhZ1xyXG4gICAqIEBwYXJhbSBzYW1lU2l0ZSBDb29raWUgc2FtZVNpdGUgZmxhZyAtIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUVFAvSGVhZGVycy9TZXQtQ29va2llL1NhbWVTaXRlXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBkZWxldGUobmFtZTogc3RyaW5nLCBwYXRoPzogc3RyaW5nLCBkb21haW4/OiBzdHJpbmcsIHNlY3VyZT86IGJvb2xlYW4sIHNhbWVTaXRlOiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnID0gJ0xheCcpOiB2b2lkIHtcclxuICAgIGNvbnN0IGV4cGlyZXNEYXRlID0gbmV3IERhdGUoJ1RodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDEgR01UJyk7XHJcbiAgICB0aGlzLnNldChuYW1lLCAnJywgeyBleHBpcmVzOiBleHBpcmVzRGF0ZSwgcGF0aCwgZG9tYWluLCBzZWN1cmUsIHNhbWVTaXRlIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVsZXRlIGFsbCBjb29raWVzXHJcbiAgICpcclxuICAgKiBAcGFyYW0gcGF0aCAgIENvb2tpZSBwYXRoXHJcbiAgICogQHBhcmFtIGRvbWFpbiBDb29raWUgZG9tYWluXHJcbiAgICogQHBhcmFtIHNlY3VyZSBJcyB0aGUgQ29va2llIHNlY3VyZVxyXG4gICAqIEBwYXJhbSBzYW1lU2l0ZSBJcyB0aGUgY29va2llIHNhbWUgc2l0ZVxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgZGVsZXRlQWxsKHBhdGg/OiBzdHJpbmcsIGRvbWFpbj86IHN0cmluZywgc2VjdXJlPzogYm9vbGVhbiwgc2FtZVNpdGU6ICdMYXgnIHwgJ05vbmUnIHwgJ1N0cmljdCcgPSAnTGF4Jyk6IHZvaWQge1xyXG4gICAgY29uc3QgY29va2llczogYW55ID0gdGhpcy5nZXRBbGwoKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGNvb2tpZU5hbWUgaW4gY29va2llcykge1xyXG4gICAgICBpZiAoY29va2llcy5oYXNPd25Qcm9wZXJ0eShjb29raWVOYW1lKSkge1xyXG4gICAgICAgIHRoaXMuZGVsZXRlKGNvb2tpZU5hbWUsIHBhdGgsIGRvbWFpbiwgc2VjdXJlLCBzYW1lU2l0ZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19