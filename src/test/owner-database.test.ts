import { describe, expect, it } from "vitest";
import sqlParser from "node-sql-parser";
import { assertOwner, compileDataQuery, OWNER_ID, QUERY_TIMEOUT_MS } from "../../supabase/functions/owner-database/model";
const compile = (sql: string) => compileDataQuery(new sqlParser.Parser().astify(sql, { database: "Postgresql" }));
describe("owner database access", () => {
  it("accepts only the exact owner", () => expect(() => assertOwner(OWNER_ID)).not.toThrow());
  it("rejects another owner or administrator", () => expect(() => assertOwner("dac096a4-e8ab-4cb2-9b60-8aa4de76dd07")).toThrow("Forbidden"));
  it("rejects missing authentication", () => expect(() => assertOwner(undefined)).toThrow("Forbidden"));
  it("preserves the default query without private profile preferences", () => {
    const q = compile("SELECT * FROM public.profiles LIMIT 25;");
    expect(q.limit).toBe(25);
    expect(q.columns).toContain("mc_username");
    expect(q.columns).not.toContain("preferences");
  });
  it("parameterizes literal filters and ordering", () => {
    const q = compile("SELECT mc_username FROM profiles WHERE mc_username = 'KaiCenat' ORDER BY mc_username DESC LIMIT 10");
    expect(q.filters).toEqual([{ column: "mc_username", op: "eq", value: "KaiCenat" }]);
    expect(q.order).toEqual([{ column: "mc_username", ascending: false }]);
  });
  it("allows a bounded application data edit", () => {
    const q = compile("UPDATE profiles SET bio = 'hello' WHERE id = 'dac096a4-e8ab-4cb2-9b60-8aa4de76dd07'");
    expect(q.rows).toEqual([{ bio: "hello" }]);
  });
  it("allows a literal application insert", () => expect(compile("INSERT INTO clip_comments (clip_id,user_id,body) VALUES ('clip','user','hello')").rows).toEqual([{ clip_id: "clip", user_id: "user", body: "hello" }]));
  it("allows exact-row application deletes", () => expect(compile("DELETE FROM clip_comments WHERE id = 'comment'").filters[0].value).toBe("comment"));
  it("bounds results and request duration", () => {
    expect(compile("SELECT content FROM changelog_entries WHERE id = 'a'").limit).toBe(200);
    expect(compile("SELECT * FROM clip_comments LIMIT 9999").limit).toBe(200);
    expect(QUERY_TIMEOUT_MS).toBe(5000);
  });
  it.each([
    "GRANT ALL ON profiles TO anon", "DROP TABLE profiles", "SELECT * FROM auth.users",
    "SELECT * FROM user_roles", "UPDATE profiles SET preferences = '{}' WHERE id = 'a'",
    "SELECT pg_sleep(10) FROM profiles", "SELECT * FROM profiles; DELETE FROM profiles",
    "WITH a AS (DELETE FROM profiles RETURNING *) SELECT * FROM a",
    "UPDATE profiles SET bio = 'all'", "DELETE FROM clip_comments WHERE body = 'hello'",
    "SELECT * FROM profiles JOIN user_roles ON profiles.id = user_roles.user_id",
    "SELECT * FROM profiles UNION SELECT * FROM profiles", "SELECT * INTO new_table FROM profiles",
    "SELECT preferences FROM profiles", "UPDATE profiles SET bio = current_user WHERE id = 'a'",
  ])("rejects unsafe or unsupported query: %s", sql => expect(() => compile(sql)).toThrow());
});