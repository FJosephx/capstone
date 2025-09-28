package com.avatargamer.backend.auth.repo;

import com.avatargamer.backend.auth.entity.SecurityLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SecurityLogRepository extends JpaRepository<SecurityLog,Long>{

}
