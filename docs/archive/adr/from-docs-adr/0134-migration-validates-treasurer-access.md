# Migration validates Treasurer access before activation

Status: accepted

Before activation, the wizard validates that the new annual file has at least one active Treasurer and that all migrated active operator rows have an allowed role. It must report blocking validation errors instead of activating an unusable file.
