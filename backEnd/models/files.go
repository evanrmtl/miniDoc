package models

const TableNameFile = "files"

// File mapped from table <files>
type FileMigration struct {
	FileID        int32  `gorm:"column:file_id;primaryKey" json:"file_id"`
	FileName      string `gorm:"column:file_name" json:"file_name"`
	FileContent   string `gorm:"column:file_content" json:"file_content"`
	FileUpdatedAt int64  `gorm:"column:file_updated_at" json:"file_updated_at"`
}

// TableName File's table name
func (*FileMigration) TableName() string {
	return TableNameFile
}

type File struct {
	FileID        int32  `gorm:"column:file_id;primaryKey" json:"file_id"`
	FileName      string `gorm:"column:file_name" json:"file_name"`
	FileContent   string `gorm:"column:file_content" json:"file_content"`
	FileUpdatedAt int64  `gorm:"column:file_updated_at" json:"file_updated_at"`
}
