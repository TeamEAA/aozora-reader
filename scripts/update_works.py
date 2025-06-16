import json, os, re, requests
from lxml import html

AOZORA_URL = 'https://www.aozora.gr.jp/index_pages/person_all_sorted_by_added_year_month.html'
WJ = 'works.json'; WDIR = 'works'
data = json.load(open(WJ, encoding='utf-8'))
existing = {w['url'] for w in data['works']}

resp = requests.get(AOZORA_URL)
tree = html.fromstring(resp.content)
links = tree.xpath('//div[@class="main_text"]//a[contains(@href,"/cards/")]')

new = []
for a in links:
    href = a.get('href')
    title = a.text_content().strip()
    author = a.getparent().text_content().split('｜')[0].strip()
    html_url = 'https://www.aozora.gr.jp' + href
    m = re.search(r'/cards/(\d+)_', href)
    stem = m.group(1) if m else title
    fn = f'{stem}.html'
    path = os.path.join(WDIR, fn)
    if f'works/{fn}' not in existing:
        open(path,'wb').write(requests.get(html_url).content)
        new.append({
            'title': title, 'author': author,
            'url': f'works/{fn}',
            'dateAdded': requests.utils.parse_header_links(resp.headers.get('Date','')) or '',
            'viewCount': 0,
            'initial': title.charAt(0)  # 実装例。必要ならルビで正確化
        })
for e in new:
    data['works'].append(e)
if new:
    json.dump(data, open(WJ,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'Added {len(new)} works.')
else:
    print('No new works.')
