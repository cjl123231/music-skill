# Local Audio Analysis And Auto-Organize Plan

## 1. Goal

Add a local analysis pipeline so `小乐` can classify songs more like a music intelligence system instead of relying only on filename, metadata, and user memory.

Target capabilities:

- estimate BPM
- infer mood
- infer energy level
- infer coarse genre tags
- extract acoustic features
- persist analysis results
- auto-organize music into categorized folders safely

This plan is for the local edition only:

- no cloud model required
- no streaming platform API required
- analysis runs against local audio files

## 2. Scope

Phase 1:

- analyze local audio files
- store analysis results in SQLite
- infer scene tags such as `focus`, `calm`, `workout`, `relax`
- provide dry-run auto-organization output

Phase 2:

- improve classification quality
- add optional copy mode for organized folders
- expose analysis results to `小乐`

Phase 3:

- optional move mode
- scheduled rescans
- richer feature-based recommendation

Not in the first delivery:

- Spotify-level proprietary accuracy
- cloud embeddings
- neural genre classification service
- destructive file moves by default

## 3. Product Principles

1. Original files stay safe
2. Analysis is local-first
3. Classification is explainable
4. Folder organization starts with dry-run
5. Database is the source of truth, not the folder tree

## 4. Pipeline

```text
Local library scan
  -> metadata read
  -> acoustic feature extraction
  -> heuristic classification
  -> SQLite persistence
  -> optional dry-run organization plan
  -> optional copy / move execution
```

## 5. Analysis Data Model

Recommended new table:

```text
track_analysis
```

Suggested columns:

- `track_id`
- `file_path`
- `analyzed_at`
- `duration_ms`
- `bpm`
- `loudness`
- `rms_energy`
- `spectral_centroid`
- `zero_crossing_rate`
- `tempo_confidence`
- `energy_level`
- `mood_label`
- `genre_hint`
- `scene_tags_json`
- `feature_json`
- `analyzer_version`

Recommended organization plan table:

```text
track_organization_plan
```

Suggested columns:

- `track_id`
- `source_path`
- `target_path`
- `mode`
- `status`
- `created_at`

## 6. Feature Extraction

### Metadata layer

Use current metadata pipeline first:

- title
- artist
- album
- duration
- bitrate if available
- sample rate if available
- channels if available

### Acoustic feature layer

Phase 1 target features:

- BPM
- RMS energy
- loudness estimate
- spectral centroid
- zero-crossing rate
- duration bucket

These are enough for a first-pass classifier.

## 7. Classification Output

### Energy

Example buckets:

- `low`
- `medium`
- `high`

### Mood

Example buckets:

- `calm`
- `upbeat`
- `intense`
- `neutral`
- `melancholic`

### Scene tags

Example tags:

- `focus`
- `study`
- `calm`
- `relax`
- `sleep`
- `workout`
- `commute`

### Genre hint

Phase 1 should use coarse tags only:

- `pop`
- `rock`
- `electronic`
- `instrumental`
- `acoustic`
- `speech`

These are hints, not authoritative labels.

## 8. Rule Strategy

Phase 1 should be heuristic, not model-heavy.

Example rule ideas:

- high BPM + high energy -> `workout`
- low BPM + low centroid + low energy -> `calm`
- instrumental-like metadata + stable energy -> `focus`
- speech-heavy or recording-like metadata -> `speech`
- soft loudness + low energy + long duration -> `relax`

User memory should not overwrite raw analysis fields.
Instead:

- raw analysis stays objective
- `小乐` recommendation combines analysis + user preference

## 9. Folder Organization Strategy

Default root:

```text
{library}/_organized
```

Suggested subfolders:

- `Focus`
- `Calm`
- `Relax`
- `Workout`
- `Commute`
- `Speech`
- `Unsorted`

### Safety modes

Mode 1:

- `dry-run`
- produce a plan only
- no files copied or moved

Mode 2:

- `copy`
- copy files into organized folders
- original library remains untouched

Mode 3:

- `move`
- move original files
- disabled by default

Default should be:

- `dry-run`

Recommended first user-facing behavior:

- `小乐，帮我分析曲库`
- `小乐，给我看分类结果`
- `小乐，把适合学习的歌整理出来`

The first real file operation should be copy, not move.

## 10. Agent Integration

After analysis is stored, `小乐` can use it for:

- `来点高能量的`
- `来点 120 BPM 左右的`
- `来点适合跑步的`
- `把安静的歌整理出来`
- `播放能量高一点的歌`

This should be added as a new recommendation input layer:

- user memory
- scene preference
- track analysis

## 11. Implementation Proposal

Suggested new modules:

- `src/analysis/audio-feature-extractor.ts`
- `src/analysis/bpm-estimator.ts`
- `src/analysis/mood-classifier.ts`
- `src/analysis/organization-planner.ts`
- `src/analysis/organization-executor.ts`
- `src/application/use-cases/analyze-library.use-case.ts`
- `src/application/use-cases/organize-library.use-case.ts`
- `src/infrastructure/storage/sqlite/track-analysis.repository.ts`

Suggested first commands:

- `分析我的曲库`
- `查看曲库分类`
- `把适合学习的歌整理出来`
- `把高能量的歌整理出来`

## 12. Risks

1. BPM estimation quality may vary on complex tracks
2. mood and genre inference will be rough in phase 1
3. automatic organization can confuse users if done destructively
4. local analysis on large libraries can take noticeable time

## 13. Acceptance Criteria

Phase 1 is done when:

- local tracks can be analyzed and stored in SQLite
- each analyzed track has BPM, energy, and scene tags
- `小乐` can query scene-tagged tracks
- dry-run organization produces target folders without modifying originals
- copy mode can export categorized tracks safely
