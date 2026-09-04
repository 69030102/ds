import time
import os

# ตัวนับกันชน ถ้ามีการออกบัตร 2 ใบในมิลลิวินาทีเดียวกัน (ในเซสชันเดียวกัน)
_last_ms = 0
_counter = 0

def gen_ticket_id_py():
    global _last_ms, _counter

    t_ms = int(time.time() * 1000)

    if t_ms == _last_ms:
        # ออกบัตรซ้ำมิลลิวินาทีเดิม -> เพิ่ม counter กันชน
        _counter += 1
    else:
        _last_ms = t_ms
        _counter = 0

    # timestamp เต็ม ไม่ตัดทอนเหมือนเดิม (กันการวนซ้ำทุก 4.66 ชม.)
    t_hex = format(t_ms, 'x').upper()

    # random 3 ไบต์ (16.7 ล้านค่า แทนที่จะเป็น 256 ค่าเดิม)
    rand_bytes = os.urandom(3)
    rand_hex = rand_bytes.hex().upper()

    return f"P-{t_hex}-{_counter:02X}{rand_hex}"
