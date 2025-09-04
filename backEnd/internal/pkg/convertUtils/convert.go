package convertUtils

import (
	"encoding/binary"
)

func SliceIntToByte(path []int) []byte {
	var out = []byte{}
	for _, floorData := range path {
		buf := make([]byte, binary.MaxVarintLen64)
		nDataWritten := binary.PutUvarint(buf, uint64(floorData))
		bData := buf[:nDataWritten]

		buf = make([]byte, binary.MaxVarintLen64)
		nSizeWritten := binary.PutUvarint(buf, uint64(nDataWritten))
		bSize := buf[:nSizeWritten]

		out = append(out, bSize...)
		out = append(out, bData...)
	}
	return out
}

func SliceByteToSliceInt(data []byte) []int {
	var out []int
	offset := 0
	for offset < len(data) {
		sizeLen, size := binary.Uvarint(data[offset:])
		if sizeLen <= 0 {
			break
		}
		offset += int(size)

		valLen, _ := binary.Uvarint(data[offset : offset+int(sizeLen)])
		out = append(out, int(valLen))
		offset += int(sizeLen)
	}
	return out
}
