# Optional site search suggestions

Core 2.1.1 can discover suggestion sources from installed, enabled site addons.
There is no built-in site address or site-specific request parser in the core.

Register `suggestions: true` on the site object and implement
`Provider.prototype.suggest(query)`. Return a Promise with the normal
`{ cards: [...], next: null }` shape. Each card needs its own `contentId`,
`pageUrl`, `title` and `type` (`movie` or `series`); `year` is optional.
These are site cards, not TMDB identifiers.

Use the addon's scoped network client. Keep selectors, API paths, parsing and
site-specific headers inside the addon. Honour `provider.deadline` and the
normal `cancel()` contract. The core shares its two wire slots, imposes a
five-second suggestion budget, waits one second after at least three typed
characters, and displays at most six text rows.

The site appears as an additional suggestion source in Catalog and sites.
Removing/disabling it removes the option. A saved unavailable source reports
that it is unavailable; it does not silently send the query to TMDB.
Selecting a site suggestion starts a normal catalog search using its title.
It does not certify that all returned cards are the same work.

P001 2.0.3 is the first implementation. Future addons can expose the same
contract without naming themselves in the core or changing the WGT.
