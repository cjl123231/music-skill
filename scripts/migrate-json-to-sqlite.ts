import { createDatabase } from "../src/infrastructure/storage/sqlite/db.js";
import { BetterSqliteDownloadTaskRepository } from "../src/infrastructure/storage/sqlite/download-task.repository.better-sqlite.js";
import { BetterSqliteFavoritesRepository } from "../src/infrastructure/storage/sqlite/favorites.repository.better-sqlite.js";
import { BetterSqlitePlaylistsRepository } from "../src/infrastructure/storage/sqlite/playlists.repository.better-sqlite.js";
import { BetterSqliteSessionContextRepository } from "../src/infrastructure/storage/sqlite/session-context.repository.better-sqlite.js";
import { createSqliteClient } from "../src/infrastructure/storage/sqlite/sqlite-client.js";

async function main() {
  const jsonDbPath = process.env.MUSIC_JSON_DB_PATH ?? "./data/music-skill.db.json";
  const sqliteDbPath = process.env.MUSIC_SQLITE_DB_PATH ?? "./data/music-skill.db";

  const jsonDb = createDatabase(jsonDbPath);
  const state = jsonDb.read();
  const sqlite = createSqliteClient(sqliteDbPath);

  const favoritesRepository = new BetterSqliteFavoritesRepository(sqlite);
  const playlistsRepository = new BetterSqlitePlaylistsRepository(sqlite);
  const downloadTaskRepository = new BetterSqliteDownloadTaskRepository(sqlite);
  const sessionContextRepository = new BetterSqliteSessionContextRepository(sqlite);

  for (const [sessionId, context] of Object.entries(state.sessionContexts)) {
    await sessionContextRepository.save({ ...context, sessionId });
  }

  for (const [userId, favorites] of Object.entries(state.favorites)) {
    for (const track of favorites) {
      await favoritesRepository.add(userId, track);
    }
  }

  for (const playlists of Object.values(state.playlists)) {
    for (const playlist of playlists) {
      await playlistsRepository.save(playlist);
    }
  }

  for (const tasks of Object.values(state.downloadTasks)) {
    for (const task of tasks) {
      await downloadTaskRepository.save(task);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: jsonDbPath,
        target: sqliteDbPath,
        sessionContexts: Object.keys(state.sessionContexts).length,
        favoritesUsers: Object.keys(state.favorites).length,
        playlistsUsers: Object.keys(state.playlists).length,
        downloadUsers: Object.keys(state.downloadTasks).length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
