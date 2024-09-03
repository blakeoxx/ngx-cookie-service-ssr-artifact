# NGX Cookie Service SSR Artifacts

This is a repository to house backports of the `ngx-cookie-service-ssr` NPM package ([link to original package](https://www.npmjs.com/package/ngx-cookie-service-ssr))
with added support for SSR cookie interactions. Functionality for reading cookies sent by the client has existed since
the creation of the package, but setting the cookies in the server state and persisting them to the client in the
Express.js responses was a newer addition as documented by [this issue on the original repo](https://github.com/stevermeister/ngx-cookie-service/issues/266).


## Why a separate repo?

At the time of this writing, the original repo the NPM package is built from does not maintain previous versions of the
project for backport updates. However, since so many projects depend on this package, would likely also benefit
from having this functionality, and are not currently able to update Angular to a necessary version in alignment with
the NPM package, it's convenient to make available built NPM package artifacts from previous points in the project's
history in order to provide dependent projects to have a drop-in solution.


## Warnings and legalities

**Please note I am not the maintainer of the original project or NPM package, and my only affiliation with them is the
fact that I contributed to the SSR cookie writing feature linked above. All credit and rights go to the original
maintainers. Furthermore, any bugs in the software should be filed against the original repo.**

It is also **NOT RECOMMENDED** to use these artifacts in a production environment. While these artifacts were built from
the original project's source code (with the additional feature code added, as documented in the table below), **you
should not trust me or these artifacts without verifying the built code for yourself.** Trusting built packages from
untrusted strangers on the internet is always a gamble, and **neither I nor the original maintainers make any guarantee
to the safety of these artifacts.**


## How to install

If you've read the warnings section and still want to use these artifacts, consult the table below. Depending on your
project's version of Angular, run the listed command from your local project directory to install the desired artifact
as a project dependency. Once done, you should also check the readme from the associated original feature PR for any
additional steps.

Alternatively, instead of using the listed install commands to install the built artifacts, you could also download the
source code from the listed PRs and build the artifact yourself using the project's `npm run build:ngx-cookie-service-ssr` commands.

| Angular Version | Package Base Version | Original Feature PR (Built Code)                                     | Install Command                                                                                                      |
|-----------------|----------------------|----------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| 16.x.x          | 16.1.0               | [#309](https://github.com/stevermeister/ngx-cookie-service/pull/309) | `npm install --save --save-exact --alias ngx-cookie-service-ssr github:blakeoxx/ngx-cookie-service-ssr-artifact#v16` |
| 17.x.x          | 17.1.0               | [#315](https://github.com/stevermeister/ngx-cookie-service/pull/315) | `npm install --save --save-exact --alias ngx-cookie-service-ssr github:blakeoxx/ngx-cookie-service-ssr-artifact#v17` |
| 18.x.x          | 18.0.0               | [#320](https://github.com/stevermeister/ngx-cookie-service/pull/320) | `npm install --save --save-exact --alias ngx-cookie-service-ssr github:blakeoxx/ngx-cookie-service-ssr-artifact#v18` |
