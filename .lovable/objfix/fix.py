import csv,json,os,re,time,requests
W='/dev-server/.lovable/objfix'
r=list(csv.reader(open(W+'/src.csv',encoding='utf-8-sig'),delimiter=';'))
cp=W+'/cache.json'; cache=json.load(open(cp)) if os.path.exists(cp) else {}
clean=lambda t: re.sub(r'!\[\]\([^)]*\)(\{[^}]*\})?','',t).strip()
S={'type':'json_schema','json_schema':{'name':'rows','strict':True,'schema':{'type':'object','additionalProperties':False,'required':['rows'],'properties':{'rows':{'type':'array','items':{'type':'object','additionalProperties':False,'required':['o','a'],'properties':{'o':{'type':'string'},'a':{'type':'string'}}}}}}}}
P="""The text below is a Russian 2-column table (left: customer objection, right: strategic answer) extracted from a PDF with the two columns' lines interleaved, so words of objection and answer are mixed. It may start with the header "Возражение Стратегия преодоления" (drop it). Reconstruct each row: the objection (short phrase in «», reassemble its scattered fragments) and the complete answer. Do not invent content, only reorder words; fix obvious typos. Return JSON.

TEXT:
"""
todo=[a for a in r[1:] if '->' not in a[7] and a[7].strip() and a[1] not in cache]
print(len(todo),'todo',flush=True)
for a in todo:
  for i in range(6):
    try:
      res=requests.post('https://ai.gateway.lovable.dev/v1/chat/completions',headers={'Authorization':'Bearer '+os.environ['LOVABLE_API_KEY']},json={'model':'openai/gpt-6-astra','reasoning_effort':'low','messages':[{'role':'user','content':P+clean(a[7])}],'response_format':S},timeout=200)
      if res.status_code==429: time.sleep(15*(i+1)); continue
      rows=json.loads(res.json()['choices'][0]['message']['content'])['rows']
      if rows: cache[a[1]]=rows; json.dump(cache,open(cp,'w'),ensure_ascii=False); print(a[1],len(cache),flush=True); break
    except Exception as e: print('err',a[1],e,flush=True); time.sleep(5)
  time.sleep(3)
print('DONE',flush=True)
