# Owner data executor
- Translate only allowlisted parsed data statements into parameterized Data API calls; never execute or forward SQL, because privileged raw SQL would undo the prior security fix.
- Authenticate and verify the exact configured owner before creating a privileged data request; browser roles and supplied user IDs cannot authorize access.
- Keep profile operations limited to public identity fields and constrain edits/deletes to exact row IDs; permission-bearing fields and bulk writes are outside this tool.