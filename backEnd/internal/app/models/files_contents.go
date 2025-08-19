package models

const TableNameFileContents = "files_contents"

// File mapped from table <files_contents>
type FilesContentsMigration struct {
	ContentsID     string `gorm:"column:content_id;type:uuid;default:gen_random_uuid();primaryKey" json:"content_id"`
	CharacterValue []byte `gorm:"column:char_value;not null" json:"char_value"`
	Path           []byte `gorm:"column:char_path;not null" json:"path"`
	Style          uint32 `gorm:"column:char_style;not null" json:"style"`
	Color          string `gorm:"column:color;not null" json:"color"`
	FileUUID       uint32 `gorm:"column:file_uuid;not null"`
}

// TableName File's table name
func (*FilesContentsMigration) TableName() string {
	return TableNameFileContents
}

type FilesContents struct {
	ContentsID     string `gorm:"column:content_id;type:uuid;default:gen_random_uuid();primaryKey" json:"content_id"`
	CharacterValue []byte `gorm:"column:char_value;not null" json:"char_value"`
	Path           []byte `gorm:"column:path;not null" json:"path"`
	Style          uint32 `gorm:"column:style;not null" json:"style"`
	Color          string `gorm:"column:color;not null" json:"color"`
	FileUUID       uint32 `gorm:"column:file_uuid;not null"`
	File           File   `gorm:"foreignKey:FileUUID"`
}
