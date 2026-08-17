/**
 * MSW/Node lifecycle for integration tests that exercise a real Supabase
 * client against mocked handlers. Imported explicitly by each
 * tests/integration/*.test.ts file (`import "@/jest.setup"`), not wired
 * globally via jest.config.ts's setupFilesAfterEnv.
 *
 * Why not global: msw/node needs Request/Response globals that exist under
 * testEnvironment "node" but not jsdom, so loading it for jsdom-based
 * component suites (ThemeContext, ProjectCard) throws at import time.
 * It also patches global fetch, which broke fetcher.test.ts's own
 * `global.fetch = jest.fn()` mock. Scoping the import to integration tests
 * only keeps layer 1's unit/component suites completely unaffected.
 */
import WebSocket from "ws";
import { server } from "./tests/mocks/server";

// createBrowserClient() (lib/supabase/client.ts) always initializes a
// RealtimeClient, even for actions that never subscribe to anything.
// Node 20 has no native WebSocket, so supabase-js throws at client
// construction without one. No test in this project actually opens a
// realtime connection — this only exists to satisfy that constructor.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

// onUnhandledRequest: "error" — any Supabase call the code makes that isn't
// explicitly mocked fails loudly instead of silently hitting the real
// network or hanging, matching this project's confirm-don't-assume approach.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
