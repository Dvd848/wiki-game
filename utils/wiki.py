import requests
import json
import gzip

from datetime import datetime, timedelta
from itertools import islice

WIKI_PROJECT = 'he.wikipedia.org'

def send_request(url, params = None):
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36'}
    response = requests.get(url, params = params, headers = headers)
    if response.status_code != 200:
        raise RuntimeError(f'Failed to fetch {url}:', response.status_code)
    return response

def batched(iterable, n):
    "Batch data into tuples of length n. The last batch may be shorter."
    # batched('ABCDEFG', 3) --> ABC DEF G
    if n < 1:
        raise ValueError('n must be at least one')
    it = iter(iterable)
    while (batch := tuple(islice(it, n))):
        yield batch

def get_top_articles(project='en.wikipedia.org', access='all-access', year=None, month=None, day='all-days', num_articles = 1000):
    if year is None or month is None:
        # Get last month's year and month
        last_month = datetime.now() - timedelta(days=30)
        year = last_month.year
        month = last_month.month

    url = f'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/{project}/{access}/{year}/{month:02}/{day}'
    response = send_request(url)

    top_articles = response.json()['items'][0]['articles'][:num_articles]

    articles_data = []
    for article in top_articles:
        title = article['article']
        article_data = {
            'title': title
        }
        articles_data.append(article_data)

    return articles_data

def get_article_content(article_titles, project = 'en.wikipedia.org'):
    def get_article_content_single(article_titles, project, continuation_token):
        base_url = f'https://{project}/w/api.php'
        params = {
            'action': 'query',
            'format': 'json',
            'prop': 'extracts',
            'titles': '|'.join(article_titles),
            'explaintext': True,  
            'exsectionformat': 'plain',
            'exintro': True,
            'exlimit': 'max'
        }

        if continuation_token:
            params['excontinue'] = continuation_token

        response = send_request(base_url, params=params)
        data = response.json()

        articles_data = []
        pages = data.get('query', {}).get('pages', {})
        for page in pages.values():
            try:
                article_data = {
                    'title': page['title'],
                    'extract': page['extract'],
                    'pageid': page['pageid']
                }
                articles_data.append(article_data)
            except KeyError:
                pass

        continuation_token = data.get('continue', {}).get('excontinue')

        return articles_data, continuation_token
    
    all_articles_data = []
    chunk_size = 50
    for chunk in batched(article_titles, chunk_size):
        continuation_token = None
        counter = 0

        while counter <= chunk_size:
            articles_data, continuation_token = get_article_content_single(chunk, project, continuation_token)
            all_articles_data.extend(articles_data)
            
            if not continuation_token:
                break
            counter += 1

        if counter > chunk_size:
            raise RuntimeError("Attempt to retrieve all articles exceeded limit")
    
    return all_articles_data


if __name__ == '__main__':
    top_articles = get_top_articles(project=WIKI_PROJECT)
    #with open('top_articles.json', 'w') as f:
    #    json.dump(top_articles, f, indent=4)
    #print('Top 1000 articles saved to top_articles.json')

    titles = []
    forbidden_prefixes = ['מיוחד:', 'ויקיפדיה:', 'תבנית:', 'משתמש:']
    forbidden_titles = ['עמוד_ראשי']
    for i, data in enumerate(top_articles):
        title = data['title']
        if title not in forbidden_titles and all(not title.startswith(x) for x in forbidden_prefixes):
            titles.append(data['title'])

    all_articles_data = get_article_content(titles, project = WIKI_PROJECT)
    
    with open('../public/top_articles.json', 'w', encoding="utf-8") as f:
        json.dump(all_articles_data, f, indent=2, ensure_ascii=False)
    
    with gzip.open('../public/top_articles.json.gz', 'wb') as f:
        f.write(json.dumps(all_articles_data, indent=2, ensure_ascii=False).encode('utf-8'))
    