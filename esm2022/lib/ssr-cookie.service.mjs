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
     * @since: 18.1.0
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
     * @since: 18.1.0
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
     * Return `true` if {@link Document} is accessible, otherwise return `false`
     *
     * @param name Cookie name
     * @returns boolean - whether cookie with specified name exists
     *
     * @author: Stepan Suvorov
     * @since: 1.0.0
     */
    check(name) {
        if (this.documentIsAccessible) {
            // Client-side cookie check
            name = encodeURIComponent(name);
            const regExp = SsrCookieService.getCookieRegExp(name);
            return regExp.test(this.document.cookie);
        }
        else {
            // Server-side cookie check considering incoming cookies from the request and already set cookies on the response
            const allCookies = this.getCombinedCookies();
            return allCookies.has(name);
        }
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
        if (this.check(name)) {
            if (this.documentIsAccessible) {
                // Client-side cookie getter
                name = encodeURIComponent(name);
                const regExp = SsrCookieService.getCookieRegExp(name);
                const result = regExp.exec(this.document.cookie);
                return result[1] ? SsrCookieService.safeDecodeURIComponent(result[1]) : '';
            }
            else {
                // Server-side cookie getter including preset cookies from request and new cookies from response
                const allCookies = this.getCombinedCookies();
                return (allCookies.get(name) || '');
            }
        }
        else {
            return '';
        }
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
        const cookies = {};
        if (this.documentIsAccessible) {
            // Client-side cookie getter based on cookie strings
            const cookieString = this.document?.cookie;
            if (cookieString && cookieString !== '') {
                cookieString.split(';').forEach((currentCookie) => {
                    const [cookieName, cookieValue] = currentCookie.split('=');
                    cookies[SsrCookieService.safeDecodeURIComponent(cookieName.replace(/^ /, ''))] = SsrCookieService.safeDecodeURIComponent(cookieValue);
                });
            }
        }
        else {
            // Server-side cookie getter including preset cookies from request and new cookies from response
            const allCookies = this.getCombinedCookies();
            allCookies.forEach((cookieValue, cookieName) => {
                cookies[cookieName] = cookieValue;
            });
        }
        return cookies;
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
        const options = expiresOrOptions ? expiresOrOptions : {};
        const outputOptions = {};
        if (options.expires) {
            if (typeof options.expires === 'number') {
                const dateExpires = new Date(new Date().getTime() + options.expires * 1000 * 60 * 60 * 24);
                outputOptions.expires = dateExpires;
            }
            else {
                outputOptions.expires = options.expires;
            }
        }
        if (options.path) {
            outputOptions.path = options.path;
        }
        if (options.domain) {
            outputOptions.domain = options.domain;
        }
        if (options.secure === false && options.sameSite === 'None') {
            options.secure = true;
            console.warn(`[ngx-cookie-service] Cookie ${name} was forced with secure flag because sameSite=None.` +
                `More details : https://github.com/stevermeister/ngx-cookie-service/issues/86#issuecomment-597720130`);
        }
        if (options.secure) {
            outputOptions.secure = options.secure;
        }
        if (!options.sameSite) {
            options.sameSite = 'Lax';
        }
        outputOptions.sameSite = options.sameSite.toLowerCase();
        if (options.partitioned) {
            outputOptions.partitioned = options.partitioned;
        }
        if (this.documentIsAccessible) {
            // Set the client-side cookie (a string of the form `cookieName=cookieValue;opt1=optValue;opt2=optValue;`)
            let cookieString = encodeURIComponent(name) + '=' + encodeURIComponent(value) + ';';
            // Step through each option, appending it to the cookie string depending on it's type
            for (const optionName of Object.keys(outputOptions)) {
                const optionValue = outputOptions[optionName];
                if (optionValue instanceof Date) {
                    cookieString += `${optionName}=${optionValue.toUTCString()};`;
                }
                else if (typeof optionValue === 'boolean') {
                    if (optionValue) {
                        cookieString += `${optionName};`;
                    }
                }
                else if (typeof optionValue === 'string' || typeof optionValue === 'number') {
                    cookieString += `${optionName}=${optionValue};`;
                }
            }
            this.document.cookie = cookieString;
        }
        else {
            // Set the server-side cookie (on the response, to be picked up by the client)
            this.response?.cookie(name, value, outputOptions);
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.1.4", ngImport: i0, type: SsrCookieService, deps: [{ token: DOCUMENT }, { token: PLATFORM_ID }, { token: REQUEST, optional: true }, { token: RESPONSE, optional: true }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.1.4", ngImport: i0, type: SsrCookieService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.1.4", ngImport: i0, type: SsrCookieService, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3NyLWNvb2tpZS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvbmd4LWNvb2tpZS1zZXJ2aWNlLXNzci9zcmMvbGliL3Nzci1jb29raWUuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7O0FBRTlELDRDQUE0QztBQUM1QyxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLENBQVUsU0FBUyxDQUFDLENBQUM7QUFDOUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxDQUFXLFVBQVUsQ0FBQyxDQUFDO0FBS2pFLE1BQU0sT0FBTyxnQkFBZ0I7SUFHM0IsWUFDNEIsUUFBa0I7SUFDNUMsK0RBQStEO0lBQ2xDLFVBQWUsRUFDUCxPQUFnQixFQUNmLFFBQWtCO1FBSjlCLGFBQVEsR0FBUixRQUFRLENBQVU7UUFFZixlQUFVLEdBQVYsVUFBVSxDQUFLO1FBQ1AsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNmLGFBQVEsR0FBUixRQUFRLENBQVU7UUFFeEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQVk7UUFDakMsTUFBTSxXQUFXLEdBQVcsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3Q0FBd0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUzRixPQUFPLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxXQUFXLEdBQUcsUUFBUSxHQUFHLFdBQVcsR0FBRyxnQkFBZ0IsRUFBRSxH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QUFLLE1BQU0sVUFBVSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2pDLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMxRCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7OEdBNVhVLGdCQUFnQixrQkFJakIsUUFBUSxhQUVSLFdBQVcsYUFDQyxPQUFPLDZCQUNQLFFBQVE7a0hBUm5CLGdCQUFnQixjQUZmLE1BQU07OzJGQUVQLGdCQUFnQjtrQkFINUIsVUFBVTttQkFBQztvQkFDVixVQUFVLEVBQUUsTUFBTTtpQkFDbkI7OzBCQUtJLE1BQU07MkJBQUMsUUFBUTs7MEJBRWYsTUFBTTsyQkFBQyxXQUFXOzswQkFDbEIsUUFBUTs7MEJBQUksTUFBTTsyQkFBQyxPQUFPOzswQkFDMUIsUUFBUTs7MEJBQUksTUFBTTsyQkFBQyxRQUFRIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29va2llT3B0aW9ucywgUmVxdWVzdCwgUmVzcG9uc2UgfSBmcm9tICdleHByZXNzJztcclxuaW1wb3J0IHsgSW5qZWN0LCBJbmplY3RhYmxlLCBJbmplY3Rpb25Ub2tlbiwgT3B0aW9uYWwsIFBMQVRGT1JNX0lEIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCB7IERPQ1VNRU5ULCBpc1BsYXRmb3JtQnJvd3NlciB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XHJcblxyXG4vLyBEZWZpbmUgdGhlIGBSZXF1ZXN0YCBhbmQgYFJlc3BvbnNlYCB0b2tlblxyXG5leHBvcnQgY29uc3QgUkVRVUVTVCA9IG5ldyBJbmplY3Rpb25Ub2tlbjxSZXF1ZXN0PignUkVRVUVTVCcpO1xyXG5leHBvcnQgY29uc3QgUkVTUE9OU0UgPSBuZXcgSW5qZWN0aW9uVG9rZW48UmVzcG9uc2U+KCdSRVNQT05TRScpO1xyXG5cclxuQEluamVjdGFibGUoe1xyXG4gIHByb3ZpZGVkSW46ICdyb290JyxcclxufSlcclxuZXhwb3J0IGNsYXNzIFNzckNvb2tpZVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgZG9jdW1lbnRJc0FjY2Vzc2libGU6IGJvb2xlYW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgQEluamVjdChET0NVTUVOVCkgcHJpdmF0ZSBkb2N1bWVudDogRG9jdW1lbnQsXHJcbiAgICAvLyBHZXQgdGhlIGBQTEFURk9STV9JRGAgc28gd2UgY2FuIGNoZWNrIGlmIHdlJ3JlIGluIGEgYnJvd3Nlci5cclxuICAgIEBJbmplY3QoUExBVEZPUk1fSUQpIHByaXZhdGUgcGxhdGZvcm1JZDogYW55LFxyXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChSRVFVRVNUKSBwcml2YXRlIHJlcXVlc3Q6IFJlcXVlc3QsXHJcbiAgICBAT3B0aW9uYWwoKSBASW5qZWN0KFJFU1BPTlNFKSBwcml2YXRlIHJlc3BvbnNlOiBSZXNwb25zZVxyXG4gICkge1xyXG4gICAgdGhpcy5kb2N1bWVudElzQWNjZXNzaWJsZSA9IGlzUGxhdGZvcm1Ccm93c2VyKHRoaXMucGxhdGZvcm1JZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgY29va2llIFJlZ3VsYXIgRXhwcmVzc2lvblxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgQ29va2llIG5hbWVcclxuICAgKiBAcmV0dXJucyBwcm9wZXJ0eSBSZWdFeHBcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IFN0ZXBhbiBTdXZvcm92XHJcbiAgICogQHNpbmNlOiAxLjAuMFxyXG4gICAqL1xyXG4gIHN0YXRpYyBnZXRDb29raWVSZWdFeHAobmFtZTogc3RyaW5nKTogUmVnRXhwIHtcclxuICAgIGNvbnN0IGVzY2FwZWROYW1lOiBzdHJpbmcgPSBuYW1lLnJlcGxhY2UoLyhbXFxbXFxdXFx7XFx9XFwoXFwpXFx8XFw9XFw7XFwrXFw/XFwsXFwuXFwqXFxeXFwkXSkvZ2ksICdcXFxcJDEnKTtcclxuXHJcbiAgICByZXR1cm4gbmV3IFJlZ0V4cCgnKD86XicgKyBlc2NhcGVkTmFtZSArICd8O1xcXFxzKicgKyBlc2NhcGVkTmFtZSArICcpPSguKj8pKD86O3wkKScsICdnJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXRzIHRoZSB1bmVuY29kZWQgdmVyc2lvbiBvZiBhbiBlbmNvZGVkIGNvbXBvbmVudCBvZiBhIFVuaWZvcm0gUmVzb3VyY2UgSWRlbnRpZmllciAoVVJJKS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBlbmNvZGVkVVJJQ29tcG9uZW50IEEgdmFsdWUgcmVwcmVzZW50aW5nIGFuIGVuY29kZWQgVVJJIGNvbXBvbmVudC5cclxuICAgKlxyXG4gICAqIEByZXR1cm5zIFRoZSB1bmVuY29kZWQgdmVyc2lvbiBvZiBhbiBlbmNvZGVkIGNvbXBvbmVudCBvZiBhIFVuaWZvcm0gUmVzb3VyY2UgSWRlbnRpZmllciAoVVJJKS5cclxuICAgKlxyXG4gICAqIEBhdXRob3I6IFN0ZXBhbiBTdXZvcm92XHJcbiAgICogQHNpbmNlOiAxLjAuMFxyXG4gICAqL1xyXG4gIHN0YXRpYyBzYWZlRGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZWRVUklDb21wb25lbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICB0cnkge1xyXG4gICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZWRVUklDb21wb25lbnQpO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIC8vIHByb2JhYmx5IGl0IGlzIG5vdCB1cmkgZW5jb2RlZC4gcmV0dXJuIGFzIGlzXHJcbiAgICAgIHJldHVybiBlbmNvZGVkVVJJQ29tcG9uZW50O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29udmVydHMgdGhlIHByb3ZpZGVkIGNvb2tpZSBzdHJpbmcgdG8gYSBrZXktdmFsdWUgcmVwcmVzZW50YXRpb24uXHJcbiAgICpcclxuICAgKiBAcGFyYW0gY29va2llU3RyaW5nIC0gQSBjb25jYXRlbmF0ZWQgc3RyaW5nIG9mIGNvb2tpZXNcclxuICAgKiBAcmV0dXJucyBNYXAgLSBLZXktdmFsdWUgcGFpcnMgb2YgdGhlIHByb3ZpZGVkIGNvb2tpZXNcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IEJsYWtlIEJhbGxhcmQgKGJsYWtlb3h4KVxyXG4gICAqIEBzaW5jZTogMTguMS4wXHJcbiAgICovXHJcbiAgc3RhdGljIGNvb2tpZVN0cmluZ1RvTWFwKGNvb2tpZVN0cmluZzogc3RyaW5nKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XHJcbiAgICBjb25zdCBjb29raWVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz47XHJcblxyXG4gICAgaWYgKGNvb2tpZVN0cmluZz8ubGVuZ3RoIDwgMSkge1xyXG4gICAgICByZXR1cm4gY29va2llcztcclxuICAgIH1cclxuXHJcbiAgICBjb29raWVTdHJpbmcuc3BsaXQoJzsnKS5mb3JFYWNoKChjdXJyZW50Q29va2llKSA9PiB7XHJcbiAgICAgIGxldCBbY29va2llTmFtZSwgY29va2llVmFsdWVdID0gY3VycmVudENvb2tpZS5zcGxpdCgnPScpO1xyXG5cclxuICAgICAgLy8gUmVtb3ZlIGFueSBleHRyYSBzcGFjZXMgZnJvbSB0aGUgYmVnaW5uaW5nIG9mIGNvb2tpZSBuYW1lcy4gVGhlc2UgYXJlIGEgc2lkZSBlZmZlY3Qgb2YgYnJvd3Nlci9leHByZXNzIGNvb2tpZSBjb25jYXRlbmF0aW9uXHJcbiAgICAgIGNvb2tpZU5hbWUgPSBjb29raWVOYW1lLnJlcGxhY2UoL14gKy8sICcnKTtcclxuXHJcbiAgICAgIGNvb2tpZXMuc2V0KFNzckNvb2tpZVNlcnZpY2Uuc2FmZURlY29kZVVSSUNvbXBvbmVudChjb29raWVOYW1lKSwgU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KGNvb2tpZVZhbHVlKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gY29va2llcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgc3RhdGUgb2YgYWxsIGNvb2tpZXMgYmFzZWQgb24gdGhlIHJlcXVlc3QgYW5kIHJlc3BvbnNlLiBDb29raWVzIGFkZGVkIG9yIGNoYW5nZWQgaW4gdGhlIHJlc3BvbnNlXHJcbiAgICogb3ZlcnJpZGUgYW55IG9sZCB2YWx1ZXMgcHJvdmlkZWQgaW4gdGhlIHJlc3BvbnNlLlxyXG4gICAqXHJcbiAgICogQ2xpZW50LXNpZGUgd2lsbCBhbHdheXMganVzdCByZXR1cm4gdGhlIGRvY3VtZW50J3MgY29va2llcy5cclxuICAgKlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQHJldHVybnMgTWFwIC0gQWxsIGNvb2tpZXMgZnJvbSB0aGUgcmVxdWVzdCBhbmQgcmVzcG9uc2UgKG9yIGRvY3VtZW50KSBpbiBrZXktdmFsdWUgZm9ybS5cclxuICAgKlxyXG4gICAqIEBhdXRob3I6IEJsYWtlIEJhbGxhcmQgKGJsYWtlb3h4KVxyXG4gICAqIEBzaW5jZTogMTguMS4wXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRDb21iaW5lZENvb2tpZXMoKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XHJcbiAgICBpZiAodGhpcy5kb2N1bWVudElzQWNjZXNzaWJsZSkge1xyXG4gICAgICByZXR1cm4gU3NyQ29va2llU2VydmljZS5jb29raWVTdHJpbmdUb01hcCh0aGlzLmRvY3VtZW50LmNvb2tpZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdENvb2tpZXMgPSBTc3JDb29raWVTZXJ2aWNlLmNvb2tpZVN0cmluZ1RvTWFwKHRoaXMucmVxdWVzdD8uaGVhZGVycy5jb29raWUgfHwgJycpO1xyXG5cclxuICAgIGxldCByZXNwb25zZUNvb2tpZXM6IHN0cmluZyB8IHN0cmluZ1tdID0gKHRoaXMucmVzcG9uc2U/LmdldCgnU2V0LUNvb2tpZScpIHx8IFtdKTtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheShyZXNwb25zZUNvb2tpZXMpKSB7XHJcbiAgICAgIHJlc3BvbnNlQ29va2llcyA9IFtyZXNwb25zZUNvb2tpZXNdO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBhbGxDb29raWVzID0gbmV3IE1hcChyZXF1ZXN0Q29va2llcyk7XHJcbiAgICAvLyBQYXJzZSBhbmQgbWVyZ2UgcmVzcG9uc2UgY29va2llcyB3aXRoIHJlcXVlc3QgY29va2llc1xyXG4gICAgcmVzcG9uc2VDb29raWVzLmZvckVhY2goKGN1cnJlbnRDb29raWUpID0+IHtcclxuICAgICAgLy8gUmVzcG9uc2UgY29va2llIGhlYWRlcnMgcmVwcmVzZW50IGluZGl2aWR1YWwgY29va2llcyBhbmQgdGhlaXIgb3B0aW9ucywgc28gd2UgcGFyc2UgdGhlbSBzaW1pbGFyIHRvIG90aGVyIGNvb2tpZSBzdHJpbmdzLCBidXQgc2xpZ2h0bHkgZGlmZmVyZW50XHJcbiAgICAgIGxldCBbY29va2llTmFtZSwgY29va2llVmFsdWVdID0gY3VycmVudENvb2tpZS5zcGxpdCgnOycpWzBdLnNwbGl0KCc9Jyk7XHJcbiAgICAgIGlmIChjb29raWVOYW1lICE9PSAnJykge1xyXG4gICAgICAgIGFsbENvb2tpZXMuc2V0KFNzckNvb2tpZVNlcnZpY2Uuc2FmZURlY29kZVVSSUNvbXBvbmVudChjb29raWVOYW1lKSwgU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KGNvb2tpZVZhbHVlKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBhbGxDb29raWVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmV0dXJuIGB0cnVlYCBpZiB7QGxpbmsgRG9jdW1lbnR9IGlzIGFjY2Vzc2libGUsIG90aGVyd2lzZSByZXR1cm4gYGZhbHNlYFxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgQ29va2llIG5hbWVcclxuICAgKiBAcmV0dXJucyBib29sZWFuIC0gd2hldGhlciBjb29raWUgd2l0aCBzcGVjaWZpZWQgbmFtZSBleGlzdHNcclxuICAgKlxyXG4gICAqIEBhdXRob3I6IFN0ZXBhbiBTdXZvcm92XHJcbiAgICogQHNpbmNlOiAxLjAuMFxyXG4gICAqL1xyXG4gIGNoZWNrKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKHRoaXMuZG9jdW1lbnRJc0FjY2Vzc2libGUpIHtcclxuICAgICAgLy8gQ2xpZW50LXNpZGUgY29va2llIGNoZWNrXHJcbiAgICAgIG5hbWUgPSBlbmNvZGVVUklDb21wb25lbnQobmFtZSk7XHJcbiAgICAgIGNvbnN0IHJlZ0V4cDogUmVnRXhwID0gU3NyQ29va2llU2VydmljZS5nZXRDb29raWVSZWdFeHAobmFtZSk7XHJcbiAgICAgIHJldHVybiByZWdFeHAudGVzdCh0aGlzLmRvY3VtZW50LmNvb2tpZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBTZXJ2ZXItc2lkZSBjb29raWUgY2hlY2sgY29uc2lkZXJpbmcgaW5jb21pbmcgY29va2llcyBmcm9tIHRoZSByZXF1ZXN0IGFuZCBhbHJlYWR5IHNldCBjb29raWVzIG9uIHRoZSByZXNwb25zZVxyXG4gICAgICBjb25zdCBhbGxDb29raWVzID0gdGhpcy5nZXRDb21iaW5lZENvb2tpZXMoKTtcclxuICAgICAgcmV0dXJuIGFsbENvb2tpZXMuaGFzKG5hbWUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGNvb2tpZXMgYnkgbmFtZVxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgQ29va2llIG5hbWVcclxuICAgKiBAcmV0dXJucyBwcm9wZXJ0eSB2YWx1ZVxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBpZiAodGhpcy5jaGVjayhuYW1lKSkge1xyXG4gICAgICBpZiAodGhpcy5kb2N1bWVudElzQWNjZXNzaWJsZSkge1xyXG4gICAgICAgIC8vIENsaWVudC1zaWRlIGNvb2tpZSBnZXR0ZXJcclxuICAgICAgICBuYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpO1xyXG5cclxuICAgICAgICBjb25zdCByZWdFeHA6IFJlZ0V4cCA9IFNzckNvb2tpZVNlcnZpY2UuZ2V0Q29va2llUmVnRXhwKG5hbWUpO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdDogUmVnRXhwRXhlY0FycmF5ID0gcmVnRXhwLmV4ZWModGhpcy5kb2N1bWVudC5jb29raWUpO1xyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0WzFdID8gU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdFsxXSkgOiAnJztcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBTZXJ2ZXItc2lkZSBjb29raWUgZ2V0dGVyIGluY2x1ZGluZyBwcmVzZXQgY29va2llcyBmcm9tIHJlcXVlc3QgYW5kIG5ldyBjb29raWVzIGZyb20gcmVzcG9uc2VcclxuICAgICAgICBjb25zdCBhbGxDb29raWVzID0gdGhpcy5nZXRDb21iaW5lZENvb2tpZXMoKTtcclxuICAgICAgICByZXR1cm4gKGFsbENvb2tpZXMuZ2V0KG5hbWUpIHx8ICcnKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFsbCBjb29raWVzIGluIEpTT04gZm9ybWF0XHJcbiAgICpcclxuICAgKiBAcmV0dXJucyBhbGwgdGhlIGNvb2tpZXMgaW4ganNvblxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgZ2V0QWxsKCk6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0ge1xyXG4gICAgY29uc3QgY29va2llczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xyXG5cclxuICAgIGlmICh0aGlzLmRvY3VtZW50SXNBY2Nlc3NpYmxlKSB7XHJcbiAgICAgIC8vIENsaWVudC1zaWRlIGNvb2tpZSBnZXR0ZXIgYmFzZWQgb24gY29va2llIHN0cmluZ3NcclxuICAgICAgY29uc3QgY29va2llU3RyaW5nOiBhbnkgPSB0aGlzLmRvY3VtZW50Py5jb29raWU7XHJcblxyXG4gICAgICBpZiAoY29va2llU3RyaW5nICYmIGNvb2tpZVN0cmluZyAhPT0gJycpIHtcclxuICAgICAgICBjb29raWVTdHJpbmcuc3BsaXQoJzsnKS5mb3JFYWNoKChjdXJyZW50Q29va2llKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBbY29va2llTmFtZSwgY29va2llVmFsdWVdID0gY3VycmVudENvb2tpZS5zcGxpdCgnPScpO1xyXG4gICAgICAgICAgY29va2llc1tTc3JDb29raWVTZXJ2aWNlLnNhZmVEZWNvZGVVUklDb21wb25lbnQoY29va2llTmFtZS5yZXBsYWNlKC9eIC8sICcnKSldID0gU3NyQ29va2llU2VydmljZS5zYWZlRGVjb2RlVVJJQ29tcG9uZW50KGNvb2tpZVZhbHVlKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gU2VydmVyLXNpZGUgY29va2llIGdldHRlciBpbmNsdWRpbmcgcHJlc2V0IGNvb2tpZXMgZnJvbSByZXF1ZXN0IGFuZCBuZXcgY29va2llcyBmcm9tIHJlc3BvbnNlXHJcbiAgICAgIGNvbnN0IGFsbENvb2tpZXMgPSB0aGlzLmdldENvbWJpbmVkQ29va2llcygpO1xyXG4gICAgICBhbGxDb29raWVzLmZvckVhY2goKGNvb2tpZVZhbHVlLCBjb29raWVOYW1lKSA9PiB7XHJcbiAgICAgICAgY29va2llc1tjb29raWVOYW1lXSA9IGNvb2tpZVZhbHVlO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gY29va2llcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCBjb29raWUgYmFzZWQgb24gcHJvdmlkZWQgaW5mb3JtYXRpb25cclxuICAgKlxyXG4gICAqIEBwYXJhbSBuYW1lICAgICBDb29raWUgbmFtZVxyXG4gICAqIEBwYXJhbSB2YWx1ZSAgICBDb29raWUgdmFsdWVcclxuICAgKiBAcGFyYW0gZXhwaXJlcyAgTnVtYmVyIG9mIGRheXMgdW50aWwgdGhlIGNvb2tpZXMgZXhwaXJlcyBvciBhbiBhY3R1YWwgYERhdGVgXHJcbiAgICogQHBhcmFtIHBhdGggICAgIENvb2tpZSBwYXRoXHJcbiAgICogQHBhcmFtIGRvbWFpbiAgIENvb2tpZSBkb21haW5cclxuICAgKiBAcGFyYW0gc2VjdXJlICAgU2VjdXJlIGZsYWdcclxuICAgKiBAcGFyYW0gc2FtZVNpdGUgT1dBU1Agc2FtZSBzaXRlIHRva2VuIGBMYXhgLCBgTm9uZWAsIG9yIGBTdHJpY3RgLiBEZWZhdWx0cyB0byBgTGF4YFxyXG4gICAqIEBwYXJhbSBwYXJ0aXRpb25lZCBQYXJ0aXRpb25lZCBmbGFnXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBzZXQoXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICB2YWx1ZTogc3RyaW5nLFxyXG4gICAgZXhwaXJlcz86IG51bWJlciB8IERhdGUsXHJcbiAgICBwYXRoPzogc3RyaW5nLFxyXG4gICAgZG9tYWluPzogc3RyaW5nLFxyXG4gICAgc2VjdXJlPzogYm9vbGVhbixcclxuICAgIHNhbWVTaXRlPzogJ0xheCcgfCAnTm9uZScgfCAnU3RyaWN0JyxcclxuICAgIHBhcnRpdGlvbmVkPzogYm9vbGVhblxyXG4gICk6IHZvaWQ7XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCBjb29raWUgYmFzZWQgb24gcHJvdmlkZWQgaW5mb3JtYXRpb25cclxuICAgKlxyXG4gICAqIENvb2tpZSdzIHBhcmFtZXRlcnM6XHJcbiAgICogPHByZT5cclxuICAgKiBleHBpcmVzICBOdW1iZXIgb2YgZGF5cyB1bnRpbCB0aGUgY29va2llcyBleHBpcmVzIG9yIGFuIGFjdHVhbCBgRGF0ZWBcclxuICAgKiBwYXRoICAgICBDb29raWUgcGF0aFxyXG4gICAqIGRvbWFpbiAgIENvb2tpZSBkb21haW5cclxuICAgKiBzZWN1cmUgQ29va2llIHNlY3VyZSBmbGFnXHJcbiAgICogc2FtZVNpdGUgT1dBU1Agc2FtZSBzaXRlIHRva2VuIGBMYXhgLCBgTm9uZWAsIG9yIGBTdHJpY3RgLiBEZWZhdWx0cyB0byBgTGF4YFxyXG4gICAqIDwvcHJlPlxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgICAgIENvb2tpZSBuYW1lXHJcbiAgICogQHBhcmFtIHZhbHVlICAgIENvb2tpZSB2YWx1ZVxyXG4gICAqIEBwYXJhbSBvcHRpb25zICBCb2R5IHdpdGggY29va2llJ3MgcGFyYW1zXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBzZXQoXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICB2YWx1ZTogc3RyaW5nLFxyXG4gICAgb3B0aW9ucz86IHtcclxuICAgICAgZXhwaXJlcz86IG51bWJlciB8IERhdGU7XHJcbiAgICAgIHBhdGg/OiBzdHJpbmc7XHJcbiAgICAgIGRvbWFpbj86IHN0cmluZztcclxuICAgICAgc2VjdXJlPzogYm9vbGVhbjtcclxuICAgICAgc2FtZVNpdGU/OiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnO1xyXG4gICAgICBwYXJ0aXRpb25lZD86IGJvb2xlYW47XHJcbiAgICB9XHJcbiAgKTogdm9pZDtcclxuXHJcbiAgc2V0KFxyXG4gICAgbmFtZTogc3RyaW5nLFxyXG4gICAgdmFsdWU6IHN0cmluZyxcclxuICAgIGV4cGlyZXNPck9wdGlvbnM/OiBudW1iZXIgfCBEYXRlIHwgYW55LFxyXG4gICAgcGF0aD86IHN0cmluZyxcclxuICAgIGRvbWFpbj86IHN0cmluZyxcclxuICAgIHNlY3VyZT86IGJvb2xlYW4sXHJcbiAgICBzYW1lU2l0ZT86ICdMYXgnIHwgJ05vbmUnIHwgJ1N0cmljdCcsXHJcbiAgICBwYXJ0aXRpb25lZD86IGJvb2xlYW5cclxuICApOiB2b2lkIHtcclxuICAgIGlmICh0eXBlb2YgZXhwaXJlc09yT3B0aW9ucyA9PT0gJ251bWJlcicgfHwgZXhwaXJlc09yT3B0aW9ucyBpbnN0YW5jZW9mIERhdGUgfHwgcGF0aCB8fCBkb21haW4gfHwgc2VjdXJlIHx8IHNhbWVTaXRlKSB7XHJcbiAgICAgIGNvbnN0IG9wdGlvbnNCb2R5ID0ge1xyXG4gICAgICAgIGV4cGlyZXM6IGV4cGlyZXNPck9wdGlvbnMsXHJcbiAgICAgICAgcGF0aCxcclxuICAgICAgICBkb21haW4sXHJcbiAgICAgICAgc2VjdXJlLFxyXG4gICAgICAgIHNhbWVTaXRlOiBzYW1lU2l0ZSA/IHNhbWVTaXRlIDogJ0xheCcsXHJcbiAgICAgICAgcGFydGl0aW9uZWQsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICB0aGlzLnNldChuYW1lLCB2YWx1ZSwgb3B0aW9uc0JvZHkpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgb3B0aW9ucyA9IGV4cGlyZXNPck9wdGlvbnMgPyBleHBpcmVzT3JPcHRpb25zIDoge307XHJcbiAgICBjb25zdCBvdXRwdXRPcHRpb25zOiBDb29raWVPcHRpb25zID0ge307XHJcblxyXG4gICAgaWYgKG9wdGlvbnMuZXhwaXJlcykge1xyXG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZXhwaXJlcyA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICBjb25zdCBkYXRlRXhwaXJlczogRGF0ZSA9IG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgb3B0aW9ucy5leHBpcmVzICogMTAwMCAqIDYwICogNjAgKiAyNCk7XHJcblxyXG4gICAgICAgIG91dHB1dE9wdGlvbnMuZXhwaXJlcyA9IGRhdGVFeHBpcmVzO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIG91dHB1dE9wdGlvbnMuZXhwaXJlcyA9IG9wdGlvbnMuZXhwaXJlcztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLnBhdGgpIHtcclxuICAgICAgb3V0cHV0T3B0aW9ucy5wYXRoID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLmRvbWFpbikge1xyXG4gICAgICBvdXRwdXRPcHRpb25zLmRvbWFpbiA9IG9wdGlvbnMuZG9tYWluO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvcHRpb25zLnNlY3VyZSA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zYW1lU2l0ZSA9PT0gJ05vbmUnKSB7XHJcbiAgICAgIG9wdGlvbnMuc2VjdXJlID0gdHJ1ZTtcclxuICAgICAgY29uc29sZS53YXJuKFxyXG4gICAgICAgIGBbbmd4LWNvb2tpZS1zZXJ2aWNlXSBDb29raWUgJHtuYW1lfSB3YXMgZm9yY2VkIHdpdGggc2VjdXJlIGZsYWcgYmVjYXVzZSBzYW1lU2l0ZT1Ob25lLmAgK1xyXG4gICAgICAgICAgYE1vcmUgZGV0YWlscyA6IGh0dHBzOi8vZ2l0aHViLmNvbS9zdGV2ZXJtZWlzdGVyL25neC1jb29raWUtc2VydmljZS9pc3N1ZXMvODYjaXNzdWVjb21tZW50LTU5NzcyMDEzMGBcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIGlmIChvcHRpb25zLnNlY3VyZSkge1xyXG4gICAgICBvdXRwdXRPcHRpb25zLnNlY3VyZSA9IG9wdGlvbnMuc2VjdXJlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghb3B0aW9ucy5zYW1lU2l0ZSkge1xyXG4gICAgICBvcHRpb25zLnNhbWVTaXRlID0gJ0xheCc7XHJcbiAgICB9XHJcblxyXG4gICAgb3V0cHV0T3B0aW9ucy5zYW1lU2l0ZSA9IG9wdGlvbnMuc2FtZVNpdGUudG9Mb3dlckNhc2UoKSBhcyAoJ2xheCcgfCAnbm9uZScgfCAnc3RyaWN0Jyk7XHJcblxyXG4gICAgaWYgKG9wdGlvbnMucGFydGl0aW9uZWQpIHtcclxuICAgICAgb3V0cHV0T3B0aW9ucy5wYXJ0aXRpb25lZCA9IG9wdGlvbnMucGFydGl0aW9uZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuZG9jdW1lbnRJc0FjY2Vzc2libGUpIHtcclxuICAgICAgLy8gU2V0IHRoZSBjbGllbnQtc2lkZSBjb29raWUgKGEgc3RyaW5nIG9mIHRoZSBmb3JtIGBjb29raWVOYW1lPWNvb2tpZVZhbHVlO29wdDE9b3B0VmFsdWU7b3B0Mj1vcHRWYWx1ZTtgKVxyXG4gICAgICBsZXQgY29va2llU3RyaW5nOiBzdHJpbmcgPSBlbmNvZGVVUklDb21wb25lbnQobmFtZSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpICsgJzsnO1xyXG5cclxuICAgICAgLy8gU3RlcCB0aHJvdWdoIGVhY2ggb3B0aW9uLCBhcHBlbmRpbmcgaXQgdG8gdGhlIGNvb2tpZSBzdHJpbmcgZGVwZW5kaW5nIG9uIGl0J3MgdHlwZVxyXG4gICAgICBmb3IgKGNvbnN0IG9wdGlvbk5hbWUgb2YgT2JqZWN0LmtleXMob3V0cHV0T3B0aW9ucykpIHtcclxuICAgICAgICBjb25zdCBvcHRpb25WYWx1ZTogdW5rbm93biA9IG91dHB1dE9wdGlvbnNbb3B0aW9uTmFtZV07XHJcbiAgICAgICAgaWYgKG9wdGlvblZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xyXG4gICAgICAgICAgY29va2llU3RyaW5nICs9IGAke29wdGlvbk5hbWV9PSR7b3B0aW9uVmFsdWUudG9VVENTdHJpbmcoKX07YDtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcHRpb25WYWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICBpZiAob3B0aW9uVmFsdWUpIHtcclxuICAgICAgICAgICAgY29va2llU3RyaW5nICs9IGAke29wdGlvbk5hbWV9O2A7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygb3B0aW9uVmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvcHRpb25WYWx1ZSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICAgIGNvb2tpZVN0cmluZyArPSBgJHtvcHRpb25OYW1lfT0ke29wdGlvblZhbHVlfTtgO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5kb2N1bWVudC5jb29raWUgPSBjb29raWVTdHJpbmc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBTZXQgdGhlIHNlcnZlci1zaWRlIGNvb2tpZSAob24gdGhlIHJlc3BvbnNlLCB0byBiZSBwaWNrZWQgdXAgYnkgdGhlIGNsaWVudClcclxuICAgICAgdGhpcy5yZXNwb25zZT8uY29va2llKG5hbWUsIHZhbHVlLCBvdXRwdXRPcHRpb25zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBjb29raWUgYnkgbmFtZVxyXG4gICAqXHJcbiAgICogQHBhcmFtIG5hbWUgICBDb29raWUgbmFtZVxyXG4gICAqIEBwYXJhbSBwYXRoICAgQ29va2llIHBhdGhcclxuICAgKiBAcGFyYW0gZG9tYWluIENvb2tpZSBkb21haW5cclxuICAgKiBAcGFyYW0gc2VjdXJlIENvb2tpZSBzZWN1cmUgZmxhZ1xyXG4gICAqIEBwYXJhbSBzYW1lU2l0ZSBDb29raWUgc2FtZVNpdGUgZmxhZyAtIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0hUVFAvSGVhZGVycy9TZXQtQ29va2llL1NhbWVTaXRlXHJcbiAgICpcclxuICAgKiBAYXV0aG9yOiBTdGVwYW4gU3V2b3JvdlxyXG4gICAqIEBzaW5jZTogMS4wLjBcclxuICAgKi9cclxuICBkZWxldGUobmFtZTogc3RyaW5nLCBwYXRoPzogc3RyaW5nLCBkb21haW4/OiBzdHJpbmcsIHNlY3VyZT86IGJvb2xlYW4sIHNhbWVTaXRlOiAnTGF4JyB8ICdOb25lJyB8ICdTdHJpY3QnID0gJ0xheCcpOiB2b2lkIHtcclxuICAgIGNvbnN0IGV4cGlyZXNEYXRlID0gbmV3IERhdGUoJ1RodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDEgR01UJyk7XHJcbiAgICB0aGlzLnNldChuYW1lLCAnJywgeyBleHBpcmVzOiBleHBpcmVzRGF0ZSwgcGF0aCwgZG9tYWluLCBzZWN1cmUsIHNhbWVTaXRlIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVsZXRlIGFsbCBjb29raWVzXHJcbiAgICpcclxuICAgKiBAcGFyYW0gcGF0aCAgIENvb2tpZSBwYXRoXHJcbiAgICogQHBhcmFtIGRvbWFpbiBDb29raWUgZG9tYWluXHJcbiAgICogQHBhcmFtIHNlY3VyZSBJcyB0aGUgQ29va2llIHNlY3VyZVxyXG4gICAqIEBwYXJhbSBzYW1lU2l0ZSBJcyB0aGUgY29va2llIHNhbWUgc2l0ZVxyXG4gICAqXHJcbiAgICogQGF1dGhvcjogU3RlcGFuIFN1dm9yb3ZcclxuICAgKiBAc2luY2U6IDEuMC4wXHJcbiAgICovXHJcbiAgZGVsZXRlQWxsKHBhdGg/OiBzdHJpbmcsIGRvbWFpbj86IHN0cmluZywgc2VjdXJlPzogYm9vbGVhbiwgc2FtZVNpdGU6ICdMYXgnIHwgJ05vbmUnIHwgJ1N0cmljdCcgPSAnTGF4Jyk6IHZvaWQge1xyXG4gICAgY29uc3QgY29va2llczogYW55ID0gdGhpcy5nZXRBbGwoKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGNvb2tpZU5hbWUgaW4gY29va2llcykge1xyXG4gICAgICBpZiAoY29va2llcy5oYXNPd25Qcm9wZXJ0eShjb29raWVOYW1lKSkge1xyXG4gICAgICAgIHRoaXMuZGVsZXRlKGNvb2tpZU5hbWUsIHBhdGgsIGRvbWFpbiwgc2VjdXJlLCBzYW1lU2l0ZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19