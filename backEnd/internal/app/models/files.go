package models

const TableNameFile = "files"

// File mapped from table <files>
type FileMigration struct {
	FileUUID      string `gorm:"column:file_uuid;primaryKey" json:"file_uuid"`
	FileName      string `gorm:"column:file_name" json:"file_name"`
	FileUpdatedAt int64  `gorm:"column:file_updated_at" json:"file_updated_at"`
}

// TableName File's table name
func (*FileMigration) TableName() string {
	return TableNameFile
}

type File struct {
	FileUUID      string          `gorm:"column:file_uuid;primaryKey" json:"file_uuid"`
	FileName      string          `gorm:"column:file_name" json:"file_name"`
	FileUpdatedAt int64           `gorm:"column:file_updated_at" json:"file_updated_at"`
	FilesContents []FilesContents `gorm:"foreignKey:FileUUID"`
}
