import requests
import json
import gzip
import argparse
import time
import re

from pathlib import Path
from datetime import datetime, timedelta
from itertools import islice

WIKI_PROJECT = 'he.wikipedia.org'

def json_file(filepath):
    if not filepath.endswith('.json'):
        raise argparse.ArgumentTypeError('File must have a .json extension')
    return filepath

def send_request(url, params = None):
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36'}
    response = requests.get(url, params = params, headers = headers)

    #print(f"Requesting {response.url}")

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

def get_top_articles(project='en.wikipedia.org', access='all-access', year=None, month=None, day='all-days', max_articles = 1000):
    if year is None or month is None:
        # Get last month's year and month
        last_month = datetime.now() - timedelta(days=30)
        year = last_month.year
        month = last_month.month
    if str(day).isnumeric():
        day = f'{day:02}'

    url = f'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/{project}/{access}/{year}/{month:02}/{day}'
    print(f"Fetching top articles from {url}...")
    response = send_request(url)

    top_articles = response.json()['items'][0]['articles'][:max_articles]

    articles_data = []
    for article in top_articles:
        title = article['article']
        article_data = {
            'title': title,
            'views': article['views'],
            'rank': article['rank']
        }
        articles_data.append(article_data)

    return articles_data

def get_article_content(article_attributes, project = 'en.wikipedia.org'):
    def get_article_content_single(article_titles, project, continuation_token, article_attributes, normalization_map):
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
        normalized = data.get('query', {}).get('normalized', [])
        for item in normalized:
            normalization_map[item['to']] = item['from']
        
        pages = data.get('query', {}).get('pages', {})
        for page in pages.values():
            try:
                title = page['title']
                if title in normalization_map:
                    title = normalization_map[title]
                views = article_attributes[title]['views']
                rank = article_attributes[title]['rank']

                article_data = {
                    'title': page['title'],
                    'extract': page['extract'],
                    'pageid': page['pageid'],
                    'views': views,
                    'rank': rank
                }
                articles_data.append(article_data)
            except KeyError:
                #print(f" (-) Skipping {page['title']} due to missing attributes")
                pass

        continuation_token = data.get('continue', {}).get('excontinue')

        return articles_data, continuation_token
    
    all_articles_data = []
    chunk_size = 50
    article_titles = list(article_attributes.keys())
    normalization_map = {}
    for chunk in batched(article_titles, chunk_size):
        continuation_token = None
        counter = 0

        while counter <= chunk_size:
            articles_data, continuation_token = get_article_content_single(chunk, project, continuation_token, article_attributes, normalization_map)
            all_articles_data.extend(articles_data)
            
            if not continuation_token:
                break
            counter += 1

        if counter > chunk_size:
            raise RuntimeError("Attempt to retrieve all articles exceeded limit")
    
    all_articles_data.sort(key=lambda x: x['rank'])

    return all_articles_data

def is_legal_title(title):
    forbidden_prefixes = ['מיוחד:', 'ויקיפדיה:', 'תבנית:', 'משתמש:', 'קטגוריה:', 'שיחה:', 'מדיה:']
    forbidden_titles = ['עמוד_ראשי']

    if title in forbidden_titles:
        return False
    if any(title.startswith(x) for x in forbidden_prefixes):
        return False
    if title.isdigit():
        return False
    if re.search('[a-zA-Z]', title):
        return False
    
    return True

def main(output_path, max_articles):
    start_time = time.time()

    path = Path(output_path)

    two_days_ago = datetime.now() - timedelta(days=2)

    print(f"Fetching data for {two_days_ago}...")
    top_articles = get_top_articles(project=WIKI_PROJECT, 
                                    year=two_days_ago.year,
                                    month=two_days_ago.month,
                                    day=two_days_ago.day,
                                    max_articles=max_articles)

    print(f"Fetched {len(top_articles)} articles")

    print(f"Filtering data...")
    article_attributes = {}
    for data in top_articles:
        title = data['title']
        if is_legal_title(title):
            article_attributes[title] = {
                'rank': data['rank'],
                'views': data['views']
            }
        else:
            print(f" (-) Skipping {title}")

    titles = list(article_attributes.keys())
    print(f"Skipped {len(top_articles) - len(titles)} articles, {len(titles)} remaining") 
    print("Reading article content...")
    all_articles_data = get_article_content(article_attributes, project = WIKI_PROJECT)
    
    print("Dumping article content...")
    if (len(all_articles_data) > 0):
        with open(path, 'w', encoding="utf-8") as f:
            json.dump(all_articles_data, f, indent=2, ensure_ascii=False)
    
    #with gzip.open(path.with_suffix('gz'), 'wb') as f:
    #    f.write(json.dumps(all_articles_data, indent=2, ensure_ascii=False).encode('utf-8'))
    
    print("Done in {:.2f} seconds".format(time.time() - start_time))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Fetch top Wikipedia articles and dump to JSON")
    parser.add_argument("-o", "--output_file", required=True, type=json_file, help="Path to the output file")
    parser.add_argument("-m", "--max_articles", default=1000, type=int, help="Maximum number of articles to fetch")
    args = parser.parse_args()
    main(args.output_file, args.max_articles)
    