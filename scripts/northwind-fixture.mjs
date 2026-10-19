export const SITE = "https://northwind.example/";

const cover = (bg, ink, band) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 168"><rect width="120" height="168" fill="#${bg}"/><rect x="0" y="0" width="14" height="168" fill="#${ink}"/><rect x="28" y="28" width="68" height="9" rx="2" fill="#${band}"/><rect x="28" y="44" width="46" height="9" rx="2" fill="#${band}"/><circle cx="62" cy="104" r="26" fill="#${ink}" opacity=".22"/><rect x="28" y="140" width="34" height="6" rx="3" fill="#${ink}" opacity=".5"/></svg>`;

const shelf = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 190"><rect width="300" height="190" fill="#efe3c4"/><rect x="0" y="160" width="300" height="30" fill="#14342b"/><rect x="34" y="52" width="30" height="108" fill="#c4622d"/><rect x="68" y="34" width="26" height="126" fill="#2f5b4c"/><rect x="98" y="62" width="34" height="98" fill="#d9c9a3"/><rect x="136" y="44" width="24" height="116" fill="#3a1a0c"/><rect x="164" y="70" width="38" height="90" fill="#8fa79b"/><rect x="206" y="40" width="28" height="120" fill="#c4622d" opacity=".8"/><rect x="238" y="58" width="30" height="102" fill="#14342b" opacity=".85"/></svg>`;

export const FILES = {
  "/covers/the-salt-path.svg": cover("d9c9a3", "14342b", "fffdf7"),
  "/covers/piranesi.svg": cover("c4622d", "3a1a0c", "ffe9d6"),
  "/covers/small-things-like-these.svg": cover("2f5b4c", "0f281f", "d9e8e0"),
  "/art/shelf.svg": shelf,
};

const heart = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="#14342b" stroke-width="2"/></svg>`;
const bag = `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M6 8h12l-1 12H7L6 8zm3 0a3 3 0 0 1 6 0" fill="none" stroke="#f4efe2" stroke-width="2"/></svg>`;

const card = (slug, title, author, stars, price, alt) => `
    <div class="card">
      <span class="art">
        <img src="/covers/${slug}.svg"${alt ? ` alt="${alt}"` : ""}>
        <a class="save" href="/wishlist/${slug}">${heart}</a>
      </span>
      <h4>${title}</h4>
      <p class="by muted">${author}</p>
      <p class="stars">${stars}</p>
      <span class="price">${price}</span>
      <button class="buy">Add to basket</button>
    </div>`;

export const FIXTURE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Northwind Books, staff picks</title>
<style>
  :root { color-scheme: light }
  * { box-sizing: border-box }
  body { margin:0; font:16px/1.55 ui-sans-serif,system-ui,sans-serif; color:#1d1b16; background:#fffdf7 }
  header { display:flex; align-items:center; gap:20px; padding:12px 28px; background:#14342b; color:#f4efe2 }
  header strong { font-size:18px; letter-spacing:-.01em }
  nav { display:flex; gap:18px; margin-left:8px }
  nav a { color:#f4efe2; text-decoration:none; font-size:14.5px }
  nav a.plain { outline:none }
  .spacer { margin-left:auto; display:flex; align-items:center; gap:10px }
  .search { font:inherit; font-size:14px; padding:7px 10px; border:1px solid #2f5b4c; background:#0f281f; color:#f4efe2; width:170px }
  .search::placeholder { color:#7f9a8e }
  .cart { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; padding:0; border:1px solid #2f5b4c; background:#0f281f }
  .hero { display:grid; grid-template-columns: 1fr 300px; gap:28px; align-items:center; padding:26px 28px 22px; background:linear-gradient(180deg,#f8f1de,#fffdf7); border-bottom:1px solid #e8dfc7 }
  .hero h1 { font-size:31px; line-height:1.08; margin:0 0 10px; max-width:15ch; letter-spacing:-.02em }
  .hero p { margin:0 0 18px; max-width:42ch; font-size:16.5px; color:#4a463c }
  .hero figure { margin:0 }
  .hero figure img { display:block; width:300px; height:170px; object-fit:cover; border:1px solid #e8dfc7 }
  .dots { display:flex; gap:6px; justify-content:center; margin-top:10px }
  .dot { width:10px; height:10px; padding:0; border:1px solid #14342b; border-radius:50%; background:transparent }
  .dot[aria-current] { background:#14342b }
  .cta { display:flex; gap:10px; align-items:center }
  button { font:inherit; font-size:15px; padding:10px 18px; border:1px solid #14342b; background:#14342b; color:#f4efe2; cursor:pointer }
  button.ghost { background:transparent; color:#14342b }
  button.ghost.plain { outline:none }
  main { padding:22px 28px 8px }
  .row { display:flex; align-items:end; justify-content:space-between; gap:16px }
  h3 { font-size:20px; margin:0 0 2px; letter-spacing:-.01em }
  .row p { margin:0 }
  .sort { font:inherit; font-size:14px; padding:7px 10px; border:1px solid #cfc3a3; background:#fff; color:#1d1b16 }
  .muted { color:#a09a8a }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin:16px 0 4px }
  .card { border:1px solid #e8dfc7; background:#fff; padding:14px }
  .art { position:relative; display:block }
  .card img { display:block; width:100%; height:146px; object-fit:cover; object-position:top; border:1px solid #efe7d3 }
  .save { position:absolute; top:8px; right:8px; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; background:#fffdf7; border:1px solid #e8dfc7 }
  .card h4 { font-size:15px; margin:12px 0 2px; line-height:1.3 }
  .by { font-size:13px; margin:0 0 8px }
  .price { font-weight:600; font-size:15px }
  .stars { color:#c4622d; font-size:13px; letter-spacing:1px; margin:0 0 4px }
  .buy { width:100%; margin-top:10px; padding:8px; font-size:14px }
  .signup { margin:26px 0 8px; padding:20px; background:#14342b; color:#f4efe2; display:flex; gap:14px; align-items:end; flex-wrap:wrap }
  .signup h4 { margin:0 0 2px; font-size:17px }
  .signup p { margin:0; font-size:13.5px; color:#8fa79b }
  .signup input { font:inherit; font-size:14.5px; padding:9px 11px; border:1px solid #2f5b4c; background:#0f281f; color:#f4efe2; width:230px }
  .signup button { background:#c4622d; border-color:#c4622d; color:#fffdf7 }
  footer { margin-top:22px; padding:20px 28px 26px; border-top:1px solid #e8dfc7; color:#c0b9a6; font-size:13.5px }
</style></head><body>
<header>
  <strong>Northwind Books</strong>
  <nav>
    <a href="/catalogue">Catalogue</a>
    <a href="/offers" class="plain">Offers</a>
    <a href="/events">Events</a>
  </nav>
  <span class="spacer">
    <input class="search" type="search" aria-label="Search the catalogue" placeholder="Search titles">
    <button class="cart">${bag}</button>
  </span>
</header>

<div class="hero">
  <div>
    <h1>Books chosen by people who read them.</h1>
    <p>Every title on this shelf was picked and written up by a bookseller who finished it first.</p>
    <span class="cta">
      <button>Browse staff picks</button>
      <button class="ghost plain">Gift a membership</button>
    </span>
  </div>
  <figure>
    <img src="/art/shelf.svg" alt="A shelf of this month's staff picks">
    <div class="dots">
      <button class="dot" aria-label="Slide 1" aria-current="true"></button>
      <button class="dot" aria-label="Slide 2"></button>
      <button class="dot" aria-label="Slide 3"></button>
    </div>
  </figure>
</div>

<main>
  <div class="row">
    <span>
      <h3>This month on the table</h3>
      <p class="muted">Twelve titles, restocked weekly.</p>
    </span>
    <select class="sort">
      <option>Most loved</option>
      <option>Newest</option>
      <option>Price, low to high</option>
    </select>
  </div>

  <div class="grid">${card("the-salt-path", "The Salt Path", "Raynor Winn", "★★★★☆", "£9.99", "Cover of The Salt Path")}${card("piranesi", "Piranesi", "Susanna Clarke", "★★★★★", "£8.50", "")}${card("small-things-like-these", "Small Things Like These", "Claire Keegan", "★★★★☆", "£7.25", "Cover of Small Things Like These")}
  </div>

  <div class="signup">
    <span>
      <h4>The Thursday letter</h4>
      <p>One bookseller, one book, every week.</p>
    </span>
    <span class="spacer">
      <label for="email" style="display:block;font-size:13px;margin-bottom:4px">Email</label>
      <input id="email" name="email" type="email" placeholder="you@example.com">
    </span>
    <button>Subscribe</button>
  </div>
</main>
<footer>Prices include VAT. Free delivery over £25.</footer>
</body></html>`;
