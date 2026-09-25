"""Summarize repeated hero benchmark runs; no external dependencies."""
import json
import statistics
import sys
from pathlib import Path

root = Path(sys.argv[1])
runs = [json.loads(p.read_text()) for p in sorted(root.glob('*-*-*.json'))]

def measures(run):
    sample = run['sample']
    network = [r for r in run['network'] if r['url'].startswith('http')]
    paints = {e['name']: e['time'] for e in sample['paints']}
    poster_time = max(sample['posterVisible'], paints.get('first-contentful-paint', 0)) if sample['posterVisible'] is not None else None
    return {
        'hero_visible_ms': poster_time if run['variant'] == 'static' else sample['sceneVisible'],
        'hero_settled_ms': poster_time if run['variant'] == 'static' else sample['introComplete'],
        'fcp_ms': paints.get('first-contentful-paint'),
        'lcp_ms': sample['lcp'][-1]['time'] if sample['lcp'] else None,
        'cls': sum(e['value'] for e in sample['shifts']),
        'main_thread_ms': run['metrics']['TaskDuration'] * 1000,
        'js_execution_ms': run['metrics']['ScriptDuration'] * 1000,
        'long_task_blocking_ms': sum(max(0,e['duration']-50) for e in sample['longTasks']),
        'longest_task_ms': max((e['duration'] for e in sample['longTasks']),default=0),
        'js_heap_bytes': run['heap']['usedSize'],
        'transfer_bytes': sum(r['encoded'] for r in network),
        'script_transfer_bytes': sum(r['encoded'] for r in network if r['type']=='Script'),
        'requests': len(network),
        'hero_nodes': sample['heroNodes'],
        'hero_rendered_frames': len(sample['frames']),
        'frames_after_settled_plus_1s': len([t for t in sample['frames'] if sample['introComplete'] is not None and t > sample['introComplete']+1000]),
        'last_5s_hero_frames': len([t for t in sample['frames'] if t >= run['profile']['windowMs']-5000]),
    }

summary = {}
for profile in sorted({r['profile']['name'] for r in runs}):
    summary[profile]={}
    for variant in ['static','3d']:
        selected=[r for r in runs if r['profile']['name']==profile and r['variant']==variant]
        if not selected: continue
        values=[measures(r) for r in selected]
        summary[profile][variant]={'n':len(selected),'metrics':{k:{'median':statistics.median(v[k] for v in values if v[k] is not None),'min':min(v[k] for v in values if v[k] is not None),'max':max(v[k] for v in values if v[k] is not None)} for k in values[0] if all(v[k] is not None for v in values)},'errors':[e for r in selected for e in r['errors']], 'http_errors':[item for r in selected for item in r['network'] if item['status']>=400], 'gpu_renderers':list({r['sample']['gpu'] for r in selected if r['sample']['gpu']})}
    if 'static' in summary[profile] and '3d' in summary[profile]:
        sm=summary[profile]['static']['metrics']; lm=summary[profile]['3d']['metrics']
        summary[profile]['reductions_percent']={k:100*(lm[k]['median']-sm[k]['median'])/lm[k]['median'] for k in sm if k in lm and lm[k]['median']}
(root/'summary.json').write_text(json.dumps(summary,indent=2))
for profile,data in summary.items():
    print(profile)
    for k in ['hero_visible_ms','hero_settled_ms','main_thread_ms','long_task_blocking_ms','js_heap_bytes','transfer_bytes','script_transfer_bytes','requests','last_5s_hero_frames','cls']:
        print(k, {variant: entry['metrics'].get(k) for variant,entry in data.items() if variant!='reductions_percent'})
