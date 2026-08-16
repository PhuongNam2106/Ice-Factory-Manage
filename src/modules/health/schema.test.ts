import { describe, expect, it } from 'vitest'
import { parseHealthCredentials } from './schema'

describe('health credentials', () => {
  it('normalizes a valid username and rejects malformed input', () => {
    expect(parseHealthCredentials({ username: ' NhanVien ', password: '123456' })).toEqual({ username: 'nhanvien', password: '123456' })
    expect(parseHealthCredentials({ username: '../bad', password: 'secret' })).toBeNull()
  })
})
